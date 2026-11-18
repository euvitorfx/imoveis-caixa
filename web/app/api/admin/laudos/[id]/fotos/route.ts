import { NextRequest, NextResponse } from "next/server";
import { getLaudoById, updateLaudo } from "@/lib/laudos";
import clientPromise from "@/lib/mongodb";

const CAIXA_BASE = "https://venda-imoveis.caixa.gov.br";

type Ctx = { params: Promise<{ id: string }> };

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

// POST /api/admin/laudos/[id]/fotos
// Popula screenshotCaixaUrl (foto principal) e fotosAdicionais (F22-F28).
// Não usa HEAD — a Caixa bloqueia requisições do Vercel.
// O browser carrega as imagens diretamente; onError esconde as que forem 404.
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  const c = await clientPromise;
  const imovelDB = await c
    .db(process.env.MONGODB_DB)
    .collection("imoveis")
    .findOne(
      { _id: laudo.imovelId as unknown as import("mongodb").ObjectId },
      { projection: { hdnImovel: 1, fotoUrl: 1 } }
    );

  const hdnImovel =
    (laudo.imovelData?.hdnImovel as string | undefined) ??
    (imovelDB?.hdnImovel as string | undefined) ?? null;

  if (!hdnImovel) {
    return NextResponse.json({ error: "hdnImovel não encontrado no laudo" }, { status: 400 });
  }

  // Foto principal: R2 > snapshot > F21 construída (sem HEAD)
  const screenshotUrl =
    (imovelDB?.fotoUrl as string | undefined) ??
    (laudo.imovelData?.fotoUrl as string | undefined) ??
    `${CAIXA_BASE}/fotos/F${hdnImovel}21.jpg`;

  // Extras F22-F28: retorna todas sem verificar — browser testa via onError
  const extras = Array.from({ length: 7 }, (_, i) =>
    `${CAIXA_BASE}/fotos/F${hdnImovel}2${i + 2}.jpg`
  );

  await updateLaudo(id, {
    screenshotCaixaUrl: screenshotUrl,
    fotosAdicionais: extras,
  } as Parameters<typeof updateLaudo>[1]);

  return NextResponse.json({
    ok: true,
    screenshotCaixaUrl: screenshotUrl,
    fotosAdicionais: extras,
    total: 1 + extras.length,
  });
}
