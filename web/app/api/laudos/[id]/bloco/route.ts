import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLaudoById, updateLaudo } from "@/lib/laudos";
import type { BlocoLaudo } from "@/lib/laudos";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/laudos/[id]/bloco
// Body: { key: "mercado" | "matricula" | "juridica" | "viabilidade" | "parecer", conteudo: string }
// Autenticado pelo dono do laudo.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const isAdmin = req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
  if (laudo.userId !== session.user.id && !isAdmin)
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await req.json() as { key: string; conteudo: string };
  const allowedKeys = ["mercado", "matricula", "juridica", "viabilidade", "parecer"];
  if (!body.key || !allowedKeys.includes(body.key))
    return NextResponse.json({ error: "Bloco inválido" }, { status: 400 });

  const blocoAtual = (laudo.blocos as Record<string, BlocoLaudo | undefined>)[body.key] ?? { status: "concluido" as const };
  const novoBloco: BlocoLaudo = { ...blocoAtual, conteudo: body.conteudo, atualizadoEm: new Date().toISOString() };

  await updateLaudo(id, {
    blocos: {
      ...laudo.blocos,
      [body.key]: novoBloco,
    } as typeof laudo.blocos,
  });

  return NextResponse.json({ ok: true });
}
