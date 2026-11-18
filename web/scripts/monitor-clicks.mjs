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

const hoje = new Date();
hoje.setHours(0, 0, 0, 0);
const hojeISO = hoje.toISOString();

const [todosViews, todosClicks, viewsHoje, clicksHoje] = await Promise.all([
  db.collection("eventos_laudo").find({ tipo: "visualizou_botao" }).project({ userId: 1, anonId: 1 }).toArray(),
  db.collection("eventos_laudo").find({ tipo: "clicou_plano" }).project({ userId: 1, anonId: 1, userEmail: 1, criadoEm: 1 }).toArray(),
  db.collection("eventos_laudo").find({ tipo: "visualizou_botao", criadoEm: { $gte: hojeISO } }).project({ userId: 1, anonId: 1 }).toArray(),
  db.collection("eventos_laudo").find({ tipo: "clicou_plano", criadoEm: { $gte: hojeISO } }).project({ userId: 1, anonId: 1, userEmail: 1, criadoEm: 1 }).toArray(),
]);

const uid = (e) => e.userId ?? e.anonId ?? "?";
const uniqViews       = new Set(todosViews.map(uid)).size;
const uniqClicks      = new Set(todosClicks.map(uid)).size;
const uniqViewsHoje   = new Set(viewsHoje.map(uid)).size;
const uniqClicksHoje  = new Set(clicksHoje.map(uid)).size;

const ultimos = await db.collection("eventos_laudo")
  .find({ tipo: "clicou_plano" })
  .sort({ criadoEm: -1 })
  .limit(5)
  .toArray();

console.log(JSON.stringify({
  ts: new Date().toISOString().slice(0,19),
  hoje: {
    views_unicos: uniqViewsHoje,
    clicks_unicos: uniqClicksHoje,
  },
  total: {
    views_total: todosViews.length,
    views_unicos: uniqViews,
    clicks_total: todosClicks.length,
    clicks_unicos: uniqClicks,
  },
  ultimos: ultimos.map(e => ({
    em: e.criadoEm?.slice(0, 16),
    quem: e.userEmail ?? "anon:" + String(e.anonId ?? "").slice(-6),
  })),
}));

await client.close();
