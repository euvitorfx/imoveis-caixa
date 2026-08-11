import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

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

  try {
    // Já é URL do Cloudinary — retorna direto
    if (fotoUrl.includes("cloudinary.com")) {
      return NextResponse.json({ cloudinaryUrl: fotoUrl });
    }

    const hdn = hdnDaUrl(fotoUrl);

    // Verifica se já existe no Cloudinary (caminho rápido)
    if (hdn) {
      try {
        const result = await cloudinary.api.resource(`imoveis-caixa/${hdn}`);
        if (result?.secure_url) {
          return NextResponse.json({ cloudinaryUrl: result.secure_url });
        }
      } catch {
        // Não existe no Cloudinary ainda
      }
    }

    // Busca a imagem da Caixa server-side (sem restrição de CORS)
    const imgRes = await fetch(fotoUrl, {
      headers: CAIXA_HEADERS,
      signal:  AbortSignal.timeout(8000),
    });

    if (!imgRes.ok) {
      return new NextResponse("Image not available", { status: 404 });
    }

    const buffer      = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const base64Data  = `data:${contentType};base64,${buffer.toString("base64")}`;

    // Upload para Cloudinary em background para cachear nas próximas chamadas
    if (hdn) {
      cloudinary.uploader
        .upload(base64Data, {
          public_id:     `imoveis-caixa/${hdn}`,
          overwrite:     false,
          resource_type: "image",
        })
        .catch(() => {});
    }

    return NextResponse.json({ base64: base64Data });
  } catch (err) {
    console.error("[proxy-imagem-b64]", err);
    return new NextResponse("Error", { status: 500 });
  }
}
