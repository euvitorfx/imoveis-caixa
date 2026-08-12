import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";

async function col() {
  const c = await clientPromise;
  return c.db(process.env.MONGODB_DB).collection("analises_viabilidade");
}

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const c = await col();
  const doc = await c.findOne({ _id: new ObjectId(id), userId: session.user.id });
  if (!doc) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({ ...doc, _id: doc._id.toString() });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await req.json();
  const c = await col();
  await c.updateOne(
    { _id: new ObjectId(id), userId: session.user.id },
    {
      $set: {
        nome: body.nome,
        imovelRef: body.imovelRef ?? null,
        dados: body.dados,
        atualizadaEm: new Date(),
      },
    }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const c = await col();
  await c.deleteOne({ _id: new ObjectId(id), userId: session.user.id });

  return NextResponse.json({ ok: true });
}
