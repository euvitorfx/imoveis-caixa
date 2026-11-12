import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLaudoById } from "@/lib/laudos";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/laudos/[id]/status — polling do status de pagamento
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (laudo.userId !== session.user.id)
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  return NextResponse.json({ status: laudo.status });
}
