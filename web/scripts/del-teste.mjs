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
const r = await db.collection("eventos_laudo").deleteOne({ anonId: "test-monitor-check-001" });
console.log("deletados:", r.deletedCount);
await client.close();
