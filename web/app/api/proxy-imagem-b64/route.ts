import { NextRequest, NextResponse } from "next/server";

const CAIXA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
  "Referer":    "https://venda-imoveis.caixa.gov.br/",
};

function hdnDaUrl(url: string): string | null {
  const m = url.match(/F(\d+)21\.jpg/i);
  return m ? m[1] : null;
}

async function fetchAsBase64(url: string, headers?: Record<string, string>): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const buffer      = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const fotoUrl = req.nextUrl.searchParams.get("url");
  if (!fotoUrl) return new NextResponse("Missing url", { status: 400 });

  const r2Base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";

  try {
    // URL do R2 — busca server-side e retorna base64 (evita CORS no browser)
    if (r2Base && fotoUrl.startsWith(r2Base)) {
      const base64 = await fetchAsBase64(fotoUrl);
      if (base64) return NextResponse.json({ base64 });
      return new NextResponse("Image not available", { status: 404 });
    }

    // URL da Caixa — tenta encontrar no R2 primeiro
    const hdn = hdnDaUrl(fotoUrl);
    if (hdn && r2Base) {
      const r2Url = `${r2Base}/imoveis-caixa/${hdn}`;
      const base64 = await fetchAsBase64(r2Url);
      if (base64) return NextResponse.json({ base64 });
    }

    // Fallback: busca da Caixa server-side
    const base64 = await fetchAsBase64(fotoUrl, CAIXA_HEADERS);
    if (base64) return NextResponse.json({ base64 });

    return new NextResponse("Image not available", { status: 404 });
  } catch (err) {
    console.error("[proxy-imagem-b64]", err);
    return new NextResponse("Error", { status: 500 });
  }
}
