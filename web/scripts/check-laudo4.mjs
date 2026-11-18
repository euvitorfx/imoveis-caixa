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
      if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, "");
    }
  } catch {}
}
loadEnv(resolve("C:/Users/vitor/imoveis-caixa/web/.env.local"));

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB);

const laudo = await db.collection("laudos").findOne({ numero: 4 });
console.log(`\n=== JURIDICA (completo) ===\n`);
console.log(laudo.blocos?.juridica?.conteudo ?? "(vazio)");
console.log(`\n=== PARECER (completo) ===\n`);
console.log(laudo.blocos?.parecer?.conteudo ?? "(vazio)");

await client.close();
