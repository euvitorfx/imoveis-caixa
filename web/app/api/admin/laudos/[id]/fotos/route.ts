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
      signal: AbortSignal.timeout(6000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// POST /api/admin/laudos/[id]/fotos
// Detecta fotos da Caixa pelo padrão /fotos/F{hdn}2N.jpg e popula screenshotCaixaUrl + fotosAdicionais
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  const hdnImovel =
    (laudo.imovelData?.hdnImovel as string | undefined) ??
    (await (async () => {
      const c = await clientPromise;
      const imovel = await c
        .db(process.env.MONGODB_DB)
        .collection("imoveis")
        .findOne(
          { _id: laudo.imovelId as unknown as import("mongodb").ObjectId },
          { projection: { hdnImovel: 1, fotoUrl: 1 } }
        );
      return (imovel?.hdnImovel as string | undefined) ?? null;
    })());

  if (!hdnImovel) {
    return NextResponse.json({ error: "hdnImovel não encontrado no laudo" }, { status: 400 });
  }

  // Foto principal: prefere URL R2 do banco
  const fotoUrlBanco = laudo.imovelData?.fotoUrl as string | undefined;

  // Checa fotos F{hdn}21 até F{hdn}28 na Caixa em paralelo
  const candidatos = Array.from({ length: 8 }, (_, i) => ({
    idx: i + 1,
    url: `${CAIXA_BASE}/fotos/F${hdnImovel}2${i + 1}.jpg`,
  }));
  const checks = await Promise.allSettled(
    candidatos.map(({ url }) => verificarUrl(url).then((ok) => (ok ? url : null)))
  );
  const fotosCaixa = checks
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((u): u is string => u !== null);

  // Decide screenshotCaixaUrl: R2 se tiver, senão F21 da Caixa
  const screenshotUrl = fotoUrlBanco ?? fotosCaixa[0] ?? null;
  // fotosAdicionais: fotos da Caixa exceto a F21 (que é a mesma do R2)
  const extras = fotoUrlBanco ? fotosCaixa : fotosCaixa.slice(1);

  if (!screenshotUrl && !extras.length) {
    return NextResponse.json({ ok: false, mensagem: "Nenhuma foto encontrada no site da Caixa" });
  }

  await updateLaudo(id, {
    ...(screenshotUrl ? { screenshotCaixaUrl: screenshotUrl } : {}),
    fotosAdicionais: extras,
  } as Parameters<typeof updateLaudo>[1]);

  return NextResponse.json({
    ok: true,
    screenshotCaixaUrl: screenshotUrl,
    fotosAdicionais: extras,
    total: (screenshotUrl ? 1 : 0) + extras.length,
  });
}
