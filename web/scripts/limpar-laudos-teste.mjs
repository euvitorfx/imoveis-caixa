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
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv(resolve("web/.env.local"));

const DRY = !process.argv.includes("--confirmar");

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB);

// Laudos do usuário vitorvalenca1@gmail.com
const laudos = await db.collection("laudos")
  .find({ userEmail: "vitorvalenca1@gmail.com" })
  .toArray();

console.log(`\n${laudos.length} laudo(s) encontrado(s) para vitorvalenca1@gmail.com:\n`);
for (const l of laudos) {
  console.log(`  _id:    ${l._id}`);
  console.log(`  imóvel: ${l.imovelDescricao}`);
  console.log(`  status: ${l.status}`);
  console.log(`  nível:  ${l.nivel} (${l.nivel === 1 ? "R$97" : "R$297"})`);
  console.log(`  criado: ${l.criadoEm}`);
  console.log("");
}

if (DRY) {
  console.log("--- DRY RUN: nada apagado. Rode com --confirmar para apagar. ---\n");
  await client.close();
  process.exit(0);
}

// Apaga laudos
const ids = laudos.map((l) => l._id);
const r1 = await db.collection("laudos").deleteMany({ _id: { $in: ids } });
console.log(`✅ ${r1.deletedCount} laudo(s) apagado(s)`);

// Apaga eventos associados
const imovelIds = laudos.map((l) => l.imovelId);
const r2 = await db.collection("eventos_laudo").deleteMany({
  $or: [
    { userId: laudos[0]?.userId },
    { userEmail: "vitorvalenca1@gmail.com" },
  ],
});
console.log(`✅ ${r2.deletedCount} evento(s) do funil apagado(s)`);

await client.close();
console.log("\nMétricas limpas.\n");
