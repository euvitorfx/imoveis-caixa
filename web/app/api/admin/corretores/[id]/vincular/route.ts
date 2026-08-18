import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { updateCorretor } from "@/lib/corretores";
import { ObjectId } from "mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const { email } = await req.json();

  if (!email) return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 });

  const client = await clientPromise;
  const user = await client
    .db(process.env.MONGODB_DB)
    .collection("users")
    .findOne({ email: email.toLowerCase().trim() }, { projection: { _id: 1, name: 1 } });

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  // Garante que nenhum outro corretor já esteja vinculado a esse userId
  const col = client.db(process.env.MONGODB_DB).collection("corretores");
  const existente = await col.findOne({ userId: user._id.toString(), _id: { $ne: new ObjectId(id) } });
  if (existente) {
    return NextResponse.json(
      { error: `Esse usuário já está vinculado ao parceiro "${existente.nome}"` },
      { status: 409 }
    );
  }

  await updateCorretor(id, { userId: user._id.toString() } as never);

  return NextResponse.json({ ok: true, userName: user.name, userId: user._id.toString() });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await updateCorretor(id, { userId: undefined } as never);
  return NextResponse.json({ ok: true });
}
