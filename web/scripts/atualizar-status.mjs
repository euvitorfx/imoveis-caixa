/**
 * CLI para atualizar o roadmap e sprints no MongoDB sem precisar de browser.
 * Deve ser executado pelo Claude após cada implementação.
 *
 * Uso:
 *   node web/scripts/atualizar-status.mjs listar
 *   node web/scripts/atualizar-status.mjs feito "Título do item"
 *   node web/scripts/atualizar-status.mjs reabrir "Título do item"
 *   node web/scripts/atualizar-status.mjs sprint <num> "<título>" "item1|item2|item3"
 */

import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv(filePath) {
  try {
    const lines = readFileSync(filePath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* usa env vars existentes */ }
}

loadEnv(resolve("web/.env.local"));

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB  = process.env.MONGODB_DB;

if (!MONGODB_URI || !MONGODB_DB) {
  console.error("❌ MONGODB_URI e MONGODB_DB são obrigatórios no .env.local");
  process.exit(1);
}

const [,, cmd, ...args] = process.argv;

const USAGE = `
Uso:
  node web/scripts/atualizar-status.mjs listar
  node web/scripts/atualizar-status.mjs feito   "<título>"
  node web/scripts/atualizar-status.mjs reabrir "<título>"
  node web/scripts/atualizar-status.mjs sprint  <num> "<título>" "item1|item2|item3"
`;

if (!cmd || cmd === "--help" || cmd === "-h") {
  console.log(USAGE);
  process.exit(0);
}

const client = new MongoClient(MONGODB_URI);

try {
  await client.connect();
  const db = client.db(MONGODB_DB);

  // ── LISTAR ────────────────────────────────────────────────────────────────
  if (cmd === "listar") {
    const items = await db.collection("roadmap_items")
      .find({})
      .sort({ themeOrder: 1, order: 1 })
      .toArray();

    let currentTheme = "";
    for (const item of items) {
      if (item.theme !== currentTheme) {
        currentTheme = item.theme;
        console.log(`\n── ${currentTheme}`);
      }
      const badge = item.priority === "Feito" ? "✅" : item.priority === "Alta" ? "🔴" : item.priority === "Média" ? "🟡" : "⚪";
      console.log(`  ${badge} [${item.priority}] ${item.title}`);
    }

    const sprints = await db.collection("sprints").find({}).sort({ order: 1 }).toArray();
    console.log(`\n── Sprints concluídas: ${sprints.length}`);
    for (const s of sprints) {
      console.log(`  ✅ Sprint ${s.num} — ${s.title}`);
    }
    console.log("");
  }

  // ── FEITO ─────────────────────────────────────────────────────────────────
  else if (cmd === "feito") {
    const titulo = args[0];
    if (!titulo) { console.error("❌ Informe o título do item.\n" + USAGE); process.exit(1); }

    const result = await db.collection("roadmap_items").updateMany(
      { title: { $regex: titulo, $options: "i" } },
      { $set: { priority: "Feito", updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      console.error(`❌ Nenhum item encontrado com título contendo: "${titulo}"`);
      console.error('   Use: node web/scripts/atualizar-status.mjs listar');
      process.exit(1);
    }
    console.log(`✅ ${result.modifiedCount} item(ns) marcado(s) como Feito: "${titulo}"`);
  }

  // ── REABRIR ───────────────────────────────────────────────────────────────
  else if (cmd === "reabrir") {
    const titulo = args[0];
    if (!titulo) { console.error("❌ Informe o título do item.\n" + USAGE); process.exit(1); }

    const items = await db.collection("roadmap_items")
      .find({ title: { $regex: titulo, $options: "i" }, priority: "Feito" })
      .toArray();

    if (items.length === 0) {
      console.error(`❌ Nenhum item Feito encontrado com título contendo: "${titulo}"`);
      process.exit(1);
    }

    for (const item of items) {
      const original = item.originalPriority ?? "Média";
      await db.collection("roadmap_items").updateOne(
        { _id: item._id },
        { $set: { priority: original, updatedAt: new Date() } }
      );
      console.log(`↩ "${item.title}" reaberto como ${original}`);
    }
  }

  // ── SPRINT ────────────────────────────────────────────────────────────────
  else if (cmd === "sprint") {
    const [num, titulo, itemsRaw] = args;
    if (!num || !titulo || !itemsRaw) {
      console.error("❌ Informe: num, título e itens separados por |.\n" + USAGE);
      process.exit(1);
    }

    const items = itemsRaw.split("|").map((s) => s.trim()).filter(Boolean);
    const order = parseInt(num, 10);

    const existing = await db.collection("sprints").findOne({ num: String(num) });
    if (existing) {
      console.error(`❌ Sprint ${num} já existe: "${existing.title}"`);
      process.exit(1);
    }

    await db.collection("sprints").insertOne({
      num: String(num),
      title: String(titulo),
      items,
      order,
      createdAt: new Date(),
    });

    console.log(`✅ Sprint ${num} adicionada: "${titulo}"`);
    console.log(`   Itens: ${items.join(", ")}`);
  }

  else {
    console.error(`❌ Comando desconhecido: ${cmd}\n${USAGE}`);
    process.exit(1);
  }

} finally {
  await client.close();
}
