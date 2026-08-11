import { NextRequest, NextResponse } from "next/server";

const CAIXA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
  "Referer":    "https://venda-imoveis.caixa.gov.br/",
};

function hdnDaUrl(url: string): string | null {
  const m = url.match(/F(\d+)21\.jpg/i);
  return m ? m[1] : null;
}

export async function GET(req: NextRequest) {
  const fotoUrl = req.nextUrl.searchParams.get("url");
  if (!fotoUrl) return new NextResponse("Missing url", { status: 400 });

  const r2Base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";

  try {
    // Já é URL do R2 — retorna direto (CORS ok, bucket público)
    if (r2Base && fotoUrl.startsWith(r2Base)) {
      return NextResponse.json({ cloudinaryUrl: fotoUrl });
    }

    // URL da Caixa — tenta encontrar no R2 pelo hdnImovel
    const hdn = hdnDaUrl(fotoUrl);
    if (hdn && r2Base) {
      const r2Url = `${r2Base}/imoveis-caixa/${hdn}`;
      const check = await fetch(r2Url, {
        method: "HEAD",
        signal: AbortSignal.timeout(4000),
      });
      if (check.ok) {
        return NextResponse.json({ cloudinaryUrl: r2Url });
      }
    }

    // Fallback: busca da Caixa server-side e retorna base64
    const imgRes = await fetch(fotoUrl, {
      headers: CAIXA_HEADERS,
      signal:  AbortSignal.timeout(8000),
    });
    if (!imgRes.ok) {
      return new NextResponse("Image not available", { status: 404 });
    }

    const buffer      = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    return NextResponse.json({
      base64: `data:${contentType};base64,${buffer.toString("base64")}`,
    });
  } catch (err) {
    console.error("[proxy-imagem-b64]", err);
    return new NextResponse("Error", { status: 500 });
  }
}
