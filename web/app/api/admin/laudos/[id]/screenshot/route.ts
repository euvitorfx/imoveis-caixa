import { NextRequest, NextResponse } from "next/server";
import { getLaudoById, updateLaudo } from "@/lib/laudos";
import { uploadArquivo } from "@/lib/r2";
import clientPromise from "@/lib/mongodb";

// Necessário para o Chromium rodar no Vercel
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

// POST /api/admin/laudos/[id]/screenshot
// Abre a página do imóvel na Caixa com Chromium headless e captura
// apenas a parte superior (título + foto + dados principais).
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
          { projection: { hdnImovel: 1 } }
        );
      return (imovel?.hdnImovel as string | undefined) ?? null;
    })());

  if (!hdnImovel) {
    return NextResponse.json({ error: "hdnImovel não encontrado" }, { status: 400 });
  }

  const caixaUrl = `https://venda-imoveis.caixa.gov.br/sistema/detalhe-imovel.asp?hdnimovel=${hdnImovel}`;

  let screenshotUrl: string;
  try {
    // Importações dinâmicas — evitam erro de bundle no edge
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = (await import("puppeteer-core")).default;

    const executablePath = await chromium.executablePath();

    const browser = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: { width: 1280, height: 900 },
      executablePath,
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      await page.goto(caixaUrl, { waitUntil: "domcontentloaded", timeout: 20000 });

      // Aguarda a imagem principal carregar (ou 3s)
      await Promise.race([
        page.waitForSelector("img", { timeout: 3000 }).catch(() => null),
        new Promise((r) => setTimeout(r, 3000)),
      ]);

      // Captura apenas os primeiros 700px da página (cabeçalho + foto + dados principais)
      const screenshotBuffer = await page.screenshot({
        type: "jpeg",
        quality: 85,
        clip: { x: 0, y: 0, width: 1280, height: 700 },
      });

      const key = `laudos/${id}/screenshot_caixa.jpg`;
      screenshotUrl = await uploadArquivo(key, Buffer.from(screenshotBuffer), "image/jpeg");
    } finally {
      await browser.close();
    }
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error("[screenshot]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  await updateLaudo(id, {
    screenshotCaixaUrl: screenshotUrl,
  } as Parameters<typeof updateLaudo>[1]);

  return NextResponse.json({ ok: true, screenshotCaixaUrl: screenshotUrl });
}
