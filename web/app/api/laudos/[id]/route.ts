import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLaudoById, updateLaudo } from "@/lib/laudos";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/laudos/[id] — detalhe do laudo (usuário ou admin)
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const isAdmin = _req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
  if (laudo.userId !== session.user.id && !isAdmin)
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  return NextResponse.json(laudo);
}

// PATCH /api/laudos/[id] — atualiza laudo (somente admin)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || token !== process.env.ADMIN_SECRET)
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json();
  await updateLaudo(id, body);
  return NextResponse.json({ ok: true });
}
