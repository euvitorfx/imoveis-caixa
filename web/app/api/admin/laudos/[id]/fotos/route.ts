import { NextRequest, NextResponse } from "next/server";
import { getLaudoById, updateLaudo } from "@/lib/laudos";
import clientPromise from "@/lib/mongodb";

const CAIXA_BASE = "https://venda-imoveis.caixa.gov.br";

type Ctx = { params: Promise<{ id: string }> };

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

async function verificarUrl(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// POST /api/admin/laudos/[id]/fotos
// Popula screenshotCaixaUrl (foto principal) e fotosAdicionais (F22-F28).
// screenshotCaixaUrl: usa R2 do banco se disponível, senão constrói F21 diretamente
// (sem HEAD — a Caixa bloqueia HEAD do Vercel; o browser carrega a imagem normalmente).
// fotosAdicionais: verifica F22-F28 via HEAD; se Vercel for bloqueado, retorna vazio.
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  // Busca hdnImovel e fotoUrl do banco (mais atualizado que o snapshot do laudo)
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

  // Foto principal: R2 do banco > snapshot do laudo > F21 construída diretamente (sem HEAD)
  const screenshotUrl =
    (imovelDB?.fotoUrl as string | undefined) ??
    (laudo.imovelData?.fotoUrl as string | undefined) ??
    `${CAIXA_BASE}/fotos/F${hdnImovel}21.jpg`;

  // Fotos extras: verifica F22-F28 via HEAD (pode falhar no Vercel — retorna vazio se bloqueado)
  const candidatosExtras = Array.from({ length: 7 }, (_, i) =>
    `${CAIXA_BASE}/fotos/F${hdnImovel}2${i + 2}.jpg`
  );
  const checksExtras = await Promise.allSettled(
    candidatosExtras.map((url) => verificarUrl(url).then((ok) => (ok ? url : null)))
  );
  const extras = checksExtras
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((u): u is string => u !== null);

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
