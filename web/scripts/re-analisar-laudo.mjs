/**
 * Re-executa a análise de matrícula para um laudo específico via API de admin.
 * Uso: node web/scripts/re-analisar-laudo.mjs <numero_laudo>
 *   ex: node web/scripts/re-analisar-laudo.mjs 4
 *
 * Requer: servidor Next.js rodando em localhost:3000 (npm run dev)
 */
import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv(p) {
  try {
    for (const line of readFileSync(p, "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim();
      if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, "");
    }
  } catch {}
}
loadEnv(resolve("C:/Users/vitor/imoveis-caixa/web/.env.local"));

const numeroLaudo = parseInt(process.argv[2]);
const porta = process.argv[3] ?? "3000";
const tokenArg = process.argv[4];

if (!numeroLaudo) {
  console.error("Uso: node web/scripts/re-analisar-laudo.mjs <numero_laudo> [porta]");
  console.error("  ex: node web/scripts/re-analisar-laudo.mjs 4");
  process.exit(1);
}

// Busca o _id do laudo pelo número
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB);
const laudoDoc = await db.collection("laudos").findOne({ numero: numeroLaudo });
await client.close();

if (!laudoDoc) {
  console.error(`Laudo #${String(numeroLaudo).padStart(4, "0")} não encontrado.`);
  process.exit(1);
}

const laudoId = laudoDoc._id.toString();
console.log(`Laudo #${String(numeroLaudo).padStart(4, "0")} — ${laudoDoc.imovelDescricao}`);
console.log(`_id: ${laudoId}`);
const token = tokenArg ?? process.env.ADMIN_SECRET ?? "";
if (!token) {
  console.error("ADMIN_SECRET não encontrado. Passe como 4º argumento:");
  console.error("  node web/scripts/re-analisar-laudo.mjs 4 3001 <seu-admin-secret>");
  process.exit(1);
}
console.log(`Chamando POST http://localhost:${porta}/api/admin/laudos/${laudoId}/analisar ...`);
console.log("(pode levar 1-2 minutos — Claude Opus está processando o PDF)\n");

const res = await fetch(`http://localhost:${porta}/api/admin/laudos/${laudoId}/analisar`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: `admin_token=${token}`,
  },
});

const body = await res.json();

if (!res.ok) {
  console.error(`❌ Erro ${res.status}:`, body);
  process.exit(1);
}

const analise = body.analise;
console.log(`✅ Análise concluída`);
console.log(`   Matrícula: ${analise?.numeroMatricula ?? "—"}`);
console.log(`   Titular: ${analise?.titularAtual ?? "—"}`);
console.log(`   Alertas: ${analise?.alertas?.length ?? 0}`);
analise?.alertas?.forEach(a => console.log(`   [${a.gravidade}] ${a.descricao}`));
console.log(`   Tokens: ${analise?.uso?.inputTokens} in / ${analise?.uso?.outputTokens} out — US$ ${analise?.uso?.custoUSD}`);
console.log(`\nLaudo atualizado no banco com os blocos matricula, juridica e parecer.`);
