/**
 * Migration: atribui numero sequencial aos laudos sem numero
 * Executar: cd web && node scripts/fix-laudo-numero.mjs
 */

import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "fs";
import { resolve } from "path";

// Carrega .env.local
const envPath = resolve(process.cwd(), ".env.local");
const envVars = {};
try {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) envVars[key.trim()] = rest.join("=").trim();
  }
} catch {
  console.error("Não encontrou .env.local — certifique-se de rodar em web/");
  process.exit(1);
}

const MONGODB_URI = envVars.MONGODB_URI;
const DB_NAME     = envVars.MONGODB_DB ?? "imoveis_caixa";

if (!MONGODB_URI) {
  console.error("MONGODB_URI não encontrada no .env.local");
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);

async function run() {
  await client.connect();
  const db = client.db(DB_NAME);
  const laudos   = db.collection("laudos");
  const counters = db.collection("counters");

  // Laudos sem numero, ordenados por criadoEm (os mais antigos primeiro)
  const semNumero = await laudos
    .find({ numero: { $exists: false } })
    .sort({ criadoEm: 1 })
    .toArray();

  if (semNumero.length === 0) {
    console.log("✅ Nenhum laudo sem numero encontrado. Nada a fazer.");
    return;
  }

  console.log(`Encontrados ${semNumero.length} laudo(s) sem numero:`);
  for (const l of semNumero) {
    console.log(`  - ${l._id} | ${l.userEmail} | ${l.imovelDescricao?.slice(0, 60)}`);
  }

  // Atribui o próximo numero sequencial a cada um
  for (const l of semNumero) {
    const r = await counters.findOneAndUpdate(
      { _id: "laudos" },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    const numero = r?.seq ?? 1;

    await laudos.updateOne(
      { _id: l._id },
      { $set: { numero, atualizadoEm: new Date().toISOString() } }
    );
    console.log(`  ✅ Laudo ${l._id} → numero ${numero} (#${String(numero).padStart(4, "0")})`);
  }

  // Estado final do counter
  const counter = await counters.findOne({ _id: "laudos" });
  console.log(`\nCounter laudos agora em: ${counter?.seq}`);
}

run()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => client.close());
