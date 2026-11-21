import { NextRequest, NextResponse } from "next/server";
import { getLaudoById, updateLaudo } from "@/lib/laudos";
import type { BlocoLaudo } from "@/lib/laudos";

type Ctx = { params: Promise<{ id: string }> };

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

// PATCH /api/admin/laudos/[id]/bloco
// Body: { key: "mercado" | "matricula" | "juridica" | "viabilidade" | "parecer", conteudo: string }
export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  const body = await req.json() as { key: string; conteudo: string };
  const allowedKeys = ["mercado", "matricula", "juridica", "viabilidade", "parecer"];
  if (!body.key || !allowedKeys.includes(body.key))
    return NextResponse.json({ error: "Bloco inválido" }, { status: 400 });

  const blocoAtual = (laudo.blocos as Record<string, BlocoLaudo | undefined>)[body.key] ?? { status: "concluido" as const };
  const novoBloco: BlocoLaudo = {
    ...blocoAtual,
    status: "concluido",
    conteudo: body.conteudo,
    atualizadoEm: new Date().toISOString(),
  };

  await updateLaudo(id, {
    blocos: {
      ...laudo.blocos,
      [body.key]: novoBloco,
    } as typeof laudo.blocos,
  });

  return NextResponse.json({ ok: true });
}
