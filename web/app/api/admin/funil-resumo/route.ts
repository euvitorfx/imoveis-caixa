import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function auth(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const cookie = req.cookies.get("admin_token")?.value;
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return token === secret || cookie === secret;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const desdeParam = req.nextUrl.searchParams.get("desde");
  const desde = desdeParam ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const [novosViews, novosClicks, totalViews, totalClicks, totalLaudos] = await Promise.all([
    db.collection("eventos_laudo").countDocuments({ tipo: "visualizou_botao", criadoEm: { $gte: desde } }),
    db.collection("eventos_laudo").countDocuments({ tipo: "clicou_plano",     criadoEm: { $gte: desde } }),
    db.collection("eventos_laudo").countDocuments({ tipo: "visualizou_botao" }),
    db.collection("eventos_laudo").countDocuments({ tipo: "clicou_plano" }),
    db.collection("laudos").countDocuments({ status: { $nin: ["aguardando_pagamento", "cancelado"] } }),
  ]);

  const ultimoClique = await db.collection("eventos_laudo")
    .find({ tipo: "clicou_plano" })
    .sort({ criadoEm: -1 })
    .limit(1)
    .toArray();

  return NextResponse.json({
    agora: new Date().toISOString(),
    desde,
    novos: { views: novosViews, clicks: novosClicks },
    totais: { views: totalViews, clicks: totalClicks, laudos: totalLaudos },
    ultimoClique: ultimoClique[0]
      ? {
          quem: ultimoClique[0].userEmail ?? (ultimoClique[0].anonId ? `anon` : "?"),
          nivel: ultimoClique[0].nivel ?? null,
          em: ultimoClique[0].criadoEm,
        }
      : null,
  });
}
