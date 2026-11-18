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

function startOf(unit) {
  const d = new Date();
  if (unit === "day") {
    d.setHours(0, 0, 0, 0);
  } else if (unit === "week") {
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

const hoje   = startOf("day");
const semana = startOf("week");
const mes    = startOf("month");

const [total, viewsHoje, viewsSemana, viewsMes] = await Promise.all([
  db.collection("eventos_laudo").countDocuments({ tipo: "visualizou_botao" }),
  db.collection("eventos_laudo").countDocuments({ tipo: "visualizou_botao", criadoEm: { $gte: hoje } }),
  db.collection("eventos_laudo").countDocuments({ tipo: "visualizou_botao", criadoEm: { $gte: semana } }),
  db.collection("eventos_laudo").countDocuments({ tipo: "visualizou_botao", criadoEm: { $gte: mes } }),
]);

// Distribuição por dia dos últimos 14 dias
const quatorze = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
const eventos = await db.collection("eventos_laudo")
  .find({ tipo: "visualizou_botao", criadoEm: { $gte: quatorze } })
  .project({ criadoEm: 1 })
  .toArray();

const porDia = {};
for (const e of eventos) {
  const dia = String(e.criadoEm).slice(0, 10);
  porDia[dia] = (porDia[dia] || 0) + 1;
}

console.log(JSON.stringify({
  total,
  viewsHoje,
  viewsSemana,
  viewsMes,
  periodos: { hoje, semana: semana.slice(0,10), mes: mes.slice(0,10) },
  porDia,
}, null, 2));

await client.close();
