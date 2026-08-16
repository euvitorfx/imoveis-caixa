import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth, unstable_update } from "@/auth";
import clientPromise from "@/lib/mongodb";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { nome, telefone } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  const client = await clientPromise;
  await client
    .db(process.env.MONGODB_DB)
    .collection("users")
    .updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: { name: nome.trim(), telefone: telefone?.trim() || null } }
    );

  // Atualiza o token JWT no servidor para que o middleware veja temTelefone: true
  // imediatamente, sem precisar do update() no cliente
  // Dispara o jwt callback com trigger="update" para re-ler temTelefone do banco
  await unstable_update({});

  return NextResponse.json({ ok: true });
}
