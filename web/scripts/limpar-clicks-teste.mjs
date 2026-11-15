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

const DRY = !process.argv.includes("--confirmar");

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB);

const clicks = await db.collection("eventos_laudo")
  .find({ tipo: "clicou_plano" })
  .sort({ criadoEm: 1 })
  .toArray();

console.log(`\n${clicks.length} clique(s) encontrado(s):\n`);
for (const e of clicks) {
  console.log(`  ${e.criadoEm.slice(0, 16)}  anon:${String(e.anonId ?? "?").slice(-8)}  ${e.userEmail ?? "(anon)"}`);
}

if (DRY) {
  console.log("\n--- DRY RUN: nada apagado. Rode com --confirmar para apagar. ---\n");
  await client.close();
  process.exit(0);
}

const r = await db.collection("eventos_laudo").deleteMany({ tipo: "clicou_plano" });
console.log(`\n✅ ${r.deletedCount} clique(s) apagado(s). Métricas zeradas.\n`);
await client.close();
