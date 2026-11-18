/**
 * Migração: controle_parceiros.xlsx → MongoDB (coleção corretores)
 * Executar: cd web && node migrar-parceiros.mjs
 */

import { MongoClient } from "mongodb";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const MONGODB_URI = "mongodb://admin:%40Acesso00@ac-jmn2ibr-shard-00-00.98n0hxa.mongodb.net:27017,ac-jmn2ibr-shard-00-01.98n0hxa.mongodb.net:27017,ac-jmn2ibr-shard-00-02.98n0hxa.mongodb.net:27017/?ssl=true&replicaSet=atlas-pjrbdp-shard-0&authSource=admin&appName=imoveis-caixa";
const DB_NAME  = "imoveis_caixa";
const COLL     = "corretores";

// ── Helpers ───────────────────────────────────────────────────────

function slugify(nome, creci) {
  const base = nome
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const c = String(creci).toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${base}-${c}`;
}

function fmtWhatsapp(raw) {
  if (!raw) return undefined;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return undefined;
  return digits.length <= 11 ? "55" + digits : digits;
}

function mapStatus(v) {
  const m = {
    "Em negociacao":      "em_negociacao",
    "Parceiro fechado":   "parceiro_fechado",
    "Recusou":            "recusou",
    "Sem resposta":       "sem_resposta",
    "Aguardando retorno": "aguardando_retorno",
  };
  return m[v] || "sem_resposta";
}

function mapExclusividade(v) {
  return v === "Sim" ? "sim" : v === "Nao" ? "nao" : "em_analise";
}

function mapTipo(v)         { return v === "Juridica" ? "juridica" : "fisica"; }
function mapAssessora(v)    { return v === "Digital / Fisico" ? "digital_fisico" : "fisico"; }

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log("📂 Lendo ../controle_parceiros.xlsx ...");
  const wb = XLSX.readFile("../controle_parceiros.xlsx");

  // Parceiros (header na linha 2, dados a partir da linha 3)
  const pRows = XLSX.utils.sheet_to_json(wb.Sheets["Parceiros"], { header: 1, defval: "" });
  const parceiros = pRows.slice(2).filter(r => r[0] !== "");

  // Cidades (instrução na linha 3, dados a partir da linha 4)
  const cRows = XLSX.utils.sheet_to_json(wb.Sheets["Cidades"], { header: 1, defval: "" });
  const cidades = cRows.slice(3).filter(r => r[0] !== "");

  console.log(`✓ ${parceiros.length} parceiros`);
  console.log(`✓ ${cidades.length} linhas de cidades`);

  // Agrupar cidades por ID parceiro
  const cidadesMap = {};
  const now = new Date().toISOString();
  for (const r of cidades) {
    const id = Number(r[0]);
    if (!cidadesMap[id]) cidadesMap[id] = [];
    cidadesMap[id].push({
      uf:           String(r[2]),
      cidade:       String(r[3]),
      na_base_caixa: r[7] === "Sim",
      adicionada_em: now,
    });
  }

  // Conectar
  console.log("\n🔌 Conectando ao MongoDB...");
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const col = client.db(DB_NAME).collection(COLL);

  const existingIds = new Set(
    (await col.find({ id_legado: { $exists: true } }, { projection: { id_legado: 1 } }).toArray())
      .map(d => d.id_legado)
  );
  console.log(`✓ ${existingIds.size} parceiros já migrados anteriormente`);

  let inserted = 0, skipped = 0;
  const docs = [];

  for (const r of parceiros) {
    const [idLeg, nome, email, whatsapp, uf, status, exclusividade, nota, tipoPessoa, assessoramento, creci, obs] = r;
    const id = Number(idLeg);

    if (existingIds.has(id)) {
      console.log(`  ⏭  [${id}] ${nome} — já migrado`);
      skipped++;
      continue;
    }

    const doc = {
      slug:                  slugify(nome, creci),
      nome:                  String(nome),
      creci:                 String(creci),
      categoria:             "credenciado_caixa",
      cidade:                "",
      estado:                String(uf),
      bio:                   "",
      especialidades:        [],
      email:                 String(email).toLowerCase().trim(),
      whatsapp:              fmtWhatsapp(whatsapp),
      aprovado:              false,
      criadoEm:              now,
      tipo_pessoa:           mapTipo(tipoPessoa),
      assessoramento:        mapAssessora(assessoramento),
      nota_caixa:            nota !== "" ? Number(nota) : undefined,
      status_relacionamento: mapStatus(status),
      exclusividade:         mapExclusividade(exclusividade),
      cidades_cobertura:     cidadesMap[id] || [],
      observacoes_internas:  obs ? String(obs).trim() || undefined : undefined,
      origem:                "email_campanha_2025",
      id_legado:             id,
    };

    // Remove undefined fields
    for (const k of Object.keys(doc)) {
      if (doc[k] === undefined) delete doc[k];
    }

    docs.push(doc);
  }

  if (docs.length > 0) {
    const res = await col.insertMany(docs, { ordered: true });
    inserted = res.insertedCount;
  }

  await client.close();

  console.log("\n✅ Migração concluída!");
  console.log(`   Inseridos : ${inserted}`);
  console.log(`   Pulados   : ${skipped}`);

  console.log("\n📋 Resumo:");
  for (const d of docs) {
    const nc = d.cidades_cobertura?.length ?? 0;
    console.log(`   [${d.id_legado}] ${d.nome} (${d.estado}) — ${nc} cidades, nota ${d.nota_caixa ?? "—"}, WA: ${d.whatsapp ?? "—"}`);
  }
}

main().catch(err => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
