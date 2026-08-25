import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAfiliadoByUserId, getComissoesByAfiliado, getReferidosLGPD } from "@/lib/afiliados";

export async function GET(req: NextRequest) {
  void req;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const afiliado = await getAfiliadoByUserId(session.user.id);
  if (!afiliado) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const [comissoes, referidos] = await Promise.all([
    getComissoesByAfiliado(afiliado._id),
    getReferidosLGPD(afiliado._id),
  ]);

  return NextResponse.json({ afiliado, comissoes, referidos });
}
