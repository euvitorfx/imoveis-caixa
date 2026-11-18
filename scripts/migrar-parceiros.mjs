/**
 * Migração: controle_parceiros.xlsx → MongoDB (coleção corretores)
 * Executa: node scripts/migrar-parceiros.mjs
 */

import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { MongoClient } = require("../Users/vitor/imoveis-caixa/web/node_modules/mongodb/lib/index.js");
const XLSX = require("./web/node_modules/xlsx");

const MONGODB_URI = "mongodb://admin:%40Acesso00@ac-jmn2ibr-shard-00-00.98n0hxa.mongodb.net:27017,ac-jmn2ibr-shard-00-01.98n0hxa.mongodb.net:27017,ac-jmn2ibr-shard-00-02.98n0hxa.mongodb.net:27017/?ssl=true&replicaSet=atlas-pjrbdp-shard-0&authSource=admin&appName=imoveis-caixa";
const DB_NAME = "imoveis_caixa";
const COLL = "corretores";

// ── Helpers ───────────────────────────────────────────────────────

function slugify(nome, creci) {
  const base = nome
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const creciSlug = String(creci).toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${base}-${creciSlug}`;
}

function fmtWhatsapp(raw) {
  if (!raw) return undefined;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return undefined;
  // Add Brazil country code if not present (all numbers should be 10-11 digits)
  return digits.length <= 11 ? "55" + digits : digits;
}

function mapStatus(v) {
  const map = {
    "Em negociacao":      "em_negociacao",
    "Parceiro fechado":   "parceiro_fechado",
    "Recusou":            "recusou",
    "Sem resposta":       "sem_resposta",
    "Aguardando retorno": "aguardando_retorno",
  };
  return map[v] || "sem_resposta";
}

function mapExclusividade(v) {
  const map = {
    "Sim":        "sim",
    "Nao":        "nao",
    "Em analise": "em_analise",
  };
  return map[v] || "em_analise";
}

function mapTipoPessoa(v) {
  return v === "Juridica" ? "juridica" : "fisica";
}

function mapAssessoramento(v) {
  return v === "Digital / Fisico" ? "digital_fisico" : "fisico";
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log("📂 Lendo controle_parceiros.xlsx...");
  const wb = XLSX.readFile("controle_parceiros.xlsx");

  // — Parceiros —
  const parceiroRows = XLSX.utils.sheet_to_json(wb.Sheets["Parceiros"], { header: 1, defval: "" });
  const parceiros = parceiroRows.slice(2).filter(r => r[0] !== "");
  console.log(`✓ ${parceiros.length} parceiros encontrados`);

  // — Cidades —
  const cidadeRows = XLSX.utils.sheet_to_json(wb.Sheets["Cidades"], { header: 1, defval: "" });
  const cidades = cidadeRows.slice(3).filter(r => r[0] !== "");
  console.log(`✓ ${cidades.length} linhas de cidades encontradas`);

  // Agrupar cidades por ID do parceiro
  const cidadesPorId = {};
  for (const r of cidades) {
    const id = Number(r[0]);
    if (!cidadesPorId[id]) cidadesPorId[id] = [];
    cidadesPorId[id].push({
      uf:           String(r[2]),
      cidade:       String(r[3]),
      na_base_caixa: r[7] === "Sim",
      adicionada_em: new Date().toISOString(),
    });
  }

  // — Conectar ao MongoDB —
  console.log("\n🔌 Conectando ao MongoDB...");
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const col = client.db(DB_NAME).collection(COLL);
  console.log("✓ Conectado");

  // — Verificar slugs existentes para evitar duplicatas —
  const existingSlugs = new Set(
    (await col.find({}, { projection: { slug: 1 } }).toArray()).map(d => d.slug)
  );
  const existingLegacyIds = new Set(
    (await col.find({ id_legado: { $exists: true } }, { projection: { id_legado: 1 } }).toArray())
      .map(d => d.id_legado)
  );
  console.log(`✓ ${existingSlugs.size} corretores já no banco`);

  let inserted = 0;
  let skipped = 0;
  const now = new Date().toISOString();
  const docs = [];

  for (const r of parceiros) {
    const [idLeg, nome, email, whatsapp, uf, status, exclusividade, nota, tipoPessoa, assessoramento, creci, obs] = r;
    const id = Number(idLeg);

    // Skip if already migrated (by id_legado)
    if (existingLegacyIds.has(id)) {
      console.log(`  ⏭  ID ${id} (${nome}) — já migrado, pulando`);
      skipped++;
      continue;
    }

    const slug = slugify(nome, creci);

    // If slug exists (manual entry without id_legado), warn but still skip
    if (existingSlugs.has(slug)) {
      console.log(`  ⚠️  ID ${id} (${nome}) — slug "${slug}" já existe, pulando`);
      skipped++;
      continue;
    }

    const doc = {
      slug,
      nome:                   String(nome),
      creci:                  String(creci),
      categoria:              "credenciado_caixa",
      cidade:                 "",
      estado:                 String(uf),
      bio:                    "",
      especialidades:         [],
      email:                  String(email).toLowerCase().trim(),
      whatsapp:               fmtWhatsapp(whatsapp),
      aprovado:               false,
      criadoEm:               now,
      // CRM fields
      tipo_pessoa:            mapTipoPessoa(tipoPessoa),
      assessoramento:         mapAssessoramento(assessoramento),
      nota_caixa:             nota ? Number(nota) : undefined,
      status_relacionamento:  mapStatus(status),
      exclusividade:          mapExclusividade(exclusividade),
      cidades_cobertura:      cidadesPorId[id] || [],
      observacoes_internas:   obs ? String(obs).trim() : undefined,
      origem:                 "email_campanha_2025",
      id_legado:              id,
    };

    // Remove undefined fields
    Object.keys(doc).forEach(k => doc[k] === undefined && delete doc[k]);

    docs.push(doc);
  }

  if (docs.length > 0) {
    const result = await col.insertMany(docs, { ordered: false });
    inserted = result.insertedCount;
  }

  await client.close();

  console.log("\n✅ Migração concluída!");
  console.log(`   Inseridos : ${inserted}`);
  console.log(`   Pulados   : ${skipped}`);
  console.log(`   Total     : ${parceiros.length}`);

  if (docs.length > 0) {
    console.log("\n📋 Documentos inseridos:");
    docs.forEach(d => {
      const cidades = d.cidades_cobertura?.length ?? 0;
      console.log(`   [${d.id_legado}] ${d.nome} (${d.estado}) — ${cidades} cidade(s), nota ${d.nota_caixa ?? "—"}`);
    });
  }
}

main().catch(err => {
  console.error("❌ Erro na migração:", err.message);
  process.exit(1);
});
