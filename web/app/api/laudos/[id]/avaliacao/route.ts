import { NextRequest, NextResponse } from "next/server";
import { getLaudoById, updateLaudo } from "@/lib/laudos";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/laudos/[id]/avaliacao — salva NPS (sem auth, laudo deve ser "entregue")
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const laudo = await getLaudoById(id);

  if (!laudo) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (laudo.status !== "entregue")
    return NextResponse.json({ error: "Laudo ainda não entregue" }, { status: 400 });
  if (laudo.nps)
    return NextResponse.json({ error: "Avaliação já enviada" }, { status: 409 });

  const body = await req.json();
  const nota = Number(body.nota);
  if (!nota || nota < 1 || nota > 5)
    return NextResponse.json({ error: "Nota inválida (1–5)" }, { status: 400 });

  await updateLaudo(id, {
    nps: {
      nota: nota as 1 | 2 | 3 | 4 | 5,
      comentario: typeof body.comentario === "string" ? body.comentario.slice(0, 500) : undefined,
      criadoEm: new Date().toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}
