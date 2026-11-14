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

const enviados     = await db.collection("users").countDocuments({ laudoBLCEmailEnviado: true });
const aberturasRaw = await db.collection("email_opens").find({ campanhaId: "laudo-blc-01" }).sort({ abrioEm: 1 }).toArray();
const total        = aberturasRaw.length;

const porDia = {};
for (const a of aberturasRaw) {
  const dia = a.abrioEm.slice(0, 10);
  porDia[dia] = (porDia[dia] || 0) + 1;
}

console.log("\n=== CAMPANHA: laudo-blc-01 ===");
console.log(`Enviados:         ${enviados}`);
console.log(`Aberturas totais: ${total}`);
console.log(`Taxa de abertura: ${enviados > 0 ? ((total / enviados) * 100).toFixed(1) + "%" : "—"}`);
if (Object.keys(porDia).length) {
  console.log("\nPor dia:");
  for (const [dia, count] of Object.entries(porDia))
    console.log(`  ${dia}  →  ${count} abertura(s)`);
}
console.log("");

await client.close();
