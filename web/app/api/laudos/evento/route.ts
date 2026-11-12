import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json();
  const { tipo, imovelId, nivel } = body;

  if (!tipo || !imovelId) return NextResponse.json({ ok: false }, { status: 400 });

  const client = await clientPromise;
  await client
    .db(process.env.MONGODB_DB)
    .collection("eventos_laudo")
    .insertOne({
      tipo,
      userId: session.user.id,
      userEmail: session.user.email ?? "",
      userName: session.user.name ?? "",
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
  const dias = Number(url.searchParams.get("dias") ?? "30");
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

  const client = await clientPromise;
  const eventos = await client
    .db(process.env.MONGODB_DB)
    .collection("eventos_laudo")
    .find({ criadoEm: { $gte: desde } })
    .sort({ criadoEm: -1 })
    .limit(500)
    .toArray();

  return NextResponse.json(
    eventos.map((e) => ({ ...e, _id: e._id.toString() }))
  );
}
