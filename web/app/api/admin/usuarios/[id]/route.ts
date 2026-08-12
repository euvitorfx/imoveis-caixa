import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const { nome, email, telefone, plano, preferencias } = await req.json();

  const update: Record<string, unknown> = {};
  if (nome) update.name = nome;
  if (email) update.email = email.toLowerCase();
  if (telefone !== undefined) update.telefone = telefone || null;
  if (plano) update.plano = plano;
  if (preferencias !== undefined) update.preferencias = preferencias;

  const client = await clientPromise;
  await client
    .db(process.env.MONGODB_DB)
    .collection("users")
    .updateOne({ _id: new ObjectId(id) }, { $set: update });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const client = await clientPromise;
  await client
    .db(process.env.MONGODB_DB)
    .collection("users")
    .deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ ok: true });
}
