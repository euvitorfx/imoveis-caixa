import { NextRequest, NextResponse } from "next/server";
import { getAllComissoes, updateComissao } from "@/lib/afiliados";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const comissoes = await getAllComissoes();
  return NextResponse.json({ comissoes });
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id, status } = await req.json();
  if (!id || !status) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }
  await updateComissao(id, {
    status,
    pagoEm: status === "pago" ? new Date().toISOString() : undefined,
  });
  return NextResponse.json({ ok: true });
}
