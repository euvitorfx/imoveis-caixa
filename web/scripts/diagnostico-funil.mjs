import { MongoClient } from "mongodb";
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
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv(resolve("web/.env.local"));

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB);

const totalViews  = await db.collection("eventos_laudo").countDocuments({ tipo: "visualizou_botao" });
const totalCliq   = await db.collection("eventos_laudo").countDocuments({ tipo: "clicou_plano" });
const cliqLog     = await db.collection("eventos_laudo").countDocuments({ tipo: "clicou_plano", userId: { $ne: null } });
const cliqAnon    = await db.collection("eventos_laudo").countDocuments({ tipo: "clicou_plano", userId: null });

const ultimos = await db.collection("eventos_laudo")
  .find({ tipo: "clicou_plano" })
  .sort({ criadoEm: -1 })
  .limit(20)
  .toArray();

console.log("\n=== DIAGNÓSTICO DO FUNIL ===");
console.log(`visualizou_botao:  ${totalViews}`);
console.log(`clicou_plano:      ${totalCliq}`);
console.log(`  ↳ logados:       ${cliqLog}`);
console.log(`  ↳ anônimos:      ${cliqAnon}`);
console.log(`\nÚltimos 20 cliques:`);
for (const e of ultimos) {
  const quem = e.userEmail ?? (e.anonId ? `anon:${e.anonId.slice(-8)}` : "?");
  console.log(`  ${e.criadoEm.slice(0, 16)}  ${e.userId ? "logado" : "anon  "}  nível:${e.nivel ?? "?"}  ${quem}`);
}

await client.close();
