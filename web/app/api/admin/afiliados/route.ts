import { NextRequest, NextResponse } from "next/server";
import { getAllAfiliados, createAfiliado } from "@/lib/afiliados";
import clientPromise from "@/lib/mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const afiliados = await getAllAfiliados();
  return NextResponse.json({ afiliados });
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { nome, email, codigo, percentualComissao, userId } = await req.json();
  if (!nome || !email || !codigo || percentualComissao == null) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const client = await clientPromise;
  const existing = await client
    .db(process.env.MONGODB_DB)
    .collection("afiliados")
    .findOne({ codigo: codigo.toUpperCase() });
  if (existing) {
    return NextResponse.json({ error: "Código já em uso" }, { status: 409 });
  }

  const id = await createAfiliado({
    nome,
    email,
    codigo: codigo.toUpperCase(),
    percentualComissao: Number(percentualComissao),
    ativo: true,
    userId: userId || undefined,
  });

  return NextResponse.json({ ok: true, id });
}
