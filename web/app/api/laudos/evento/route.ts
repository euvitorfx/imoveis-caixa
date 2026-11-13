import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();
  const { tipo, imovelId, nivel, anonId } = body;

  if (!tipo || !imovelId) return NextResponse.json({ ok: false }, { status: 400 });

  // Sem sessão: permite visualizou_botao e clicou_plano com anonId
  if (!session?.user?.id) {
    const tiposPermitidos = ["visualizou_botao", "clicou_plano"];
    if (!tiposPermitidos.includes(tipo) || !anonId)
      return NextResponse.json({ ok: false }, { status: 401 });
  }

  const client = await clientPromise;
  await client
    .db(process.env.MONGODB_DB)
    .collection("eventos_laudo")
    .insertOne({
      tipo,
      userId: session?.user?.id ?? null,
      userEmail: session?.user?.email ?? null,
      userName: session?.user?.name ?? null,
      anonId: session ? null : (anonId ?? null),
      imovelId,
      nivel: nivel ?? null,
      criadoEm: new Date().toISOString(),
    });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || token !== process.env.ADMIN_SECRET)
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const url = new URL(req.url);
  const desde = url.searchParams.get("desde") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ate = url.searchParams.get("ate");

  const filtro: Record<string, unknown> = { criadoEm: { $gte: desde, ...(ate ? { $lte: ate } : {}) } };

  const client = await clientPromise;
  const eventos = await client
    .db(process.env.MONGODB_DB)
    .collection("eventos_laudo")
    .find(filtro)
    .sort({ criadoEm: -1 })
    .limit(500)
    .toArray();

  return NextResponse.json(
    eventos.map((e) => ({ ...e, _id: e._id.toString() }))
  );
}
