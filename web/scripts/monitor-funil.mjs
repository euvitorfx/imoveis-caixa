/**
 * Monitor do funil de conversão do Laudo BLC.
 * Recebe --desde=<ISO> como argumento para buscar apenas eventos novos.
 */
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

const desdeArg = process.argv.find((a) => a.startsWith("--desde="));
const desde = desdeArg ? desdeArg.split("=")[1] : new Date(Date.now() - 20 * 60 * 1000).toISOString();

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB);

const novosEventos = await db.collection("eventos_laudo")
  .find({ criadoEm: { $gte: desde } })
  .sort({ criadoEm: 1 })
  .toArray();

const views  = novosEventos.filter((e) => e.tipo === "visualizou_botao");
const clicks = novosEventos.filter((e) => e.tipo === "clicou_plano");

// Totais acumulados (all time)
const totalViews  = await db.collection("eventos_laudo").countDocuments({ tipo: "visualizou_botao" });
const totalClicks = await db.collection("eventos_laudo").countDocuments({ tipo: "clicou_plano" });
const totalLaudos = await db.collection("laudos").countDocuments({ status: { $nin: ["aguardando_pagamento", "cancelado"] } });

const agora = new Date().toISOString();

console.log(JSON.stringify({
  agora,
  desde,
  novos: { views: views.length, clicks: clicks.length },
  totais: { views: totalViews, clicks: totalClicks, laudos: totalLaudos },
  eventos: novosEventos.map((e) => ({
    tipo: e.tipo,
    quem: e.userEmail ?? (e.anonId ? `anon:${e.anonId.slice(-6)}` : "?"),
    logado: !!e.userId,
    nivel: e.nivel ?? null,
    imovel: e.imovelId?.slice(0, 12),
    em: e.criadoEm,
  })),
}));

await client.close();
