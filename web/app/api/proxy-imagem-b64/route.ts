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

// Extrai o hdnImovel da URL da Caixa: .../fotos/F{hdn}21.jpg
function hdnDaUrl(url: string): string | null {
  const m = url.match(/F(\d+)21\.jpg/i);
  return m ? m[1] : null;
}

export async function GET(req: NextRequest) {
  const fotoUrl = req.nextUrl.searchParams.get("url");
  if (!fotoUrl) return new NextResponse("Missing url", { status: 400 });

  try {
    // URLs do Cloudinary: retorna direto, o browser busca com CORS ok
    if (fotoUrl.includes("cloudinary.com")) {
      return NextResponse.json({ cloudinaryUrl: fotoUrl });
    }

    // URL da Caixa: verifica se já existe no Cloudinary, senão faz upload
    const hdn = hdnDaUrl(fotoUrl);
    if (hdn) {
      // Tenta buscar do Cloudinary (pode já ter sido migrado)
      try {
        const result = await cloudinary.api.resource(`imoveis-caixa/${hdn}`);
        if (result?.secure_url) {
          return NextResponse.json({ cloudinaryUrl: result.secure_url });
        }
      } catch {
        // Não existe ainda — vai fazer upload
      }

      // Upload on-demand: baixa da Caixa e envia ao Cloudinary
      const imgRes = await fetch(fotoUrl, { headers: CAIXA_HEADERS });
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const base64Data = `data:image/jpeg;base64,${buffer.toString("base64")}`;

        const uploaded = await cloudinary.uploader.upload(base64Data, {
          public_id:     `imoveis-caixa/${hdn}`,
          overwrite:     false,
          resource_type: "image",
        });

        if (uploaded?.secure_url) {
          return NextResponse.json({ cloudinaryUrl: uploaded.secure_url });
        }
      }
    }

    return new NextResponse("Not found", { status: 404 });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}
