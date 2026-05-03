import { NextResponse } from "next/server";
import { createPost, countByVideoId } from "@/lib/blog";
import { revalidatePath } from "next/cache";

interface YTItem {
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    resourceId: { videoId: string };
    thumbnails: { maxres?: { url: string }; high?: { url: string }; medium?: { url: string } };
  };
}

function estimarLeitura(desc: string) {
  const palavras = desc.trim().split(/\s+/).length;
  const minutos = Math.max(2, Math.round(palavras / 200));
  return `${minutos} min`;
}

function slugify(str: string) {
  return str
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function POST() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "YOUTUBE_API_KEY não configurada" }, { status: 500 });

  // 1. Busca o canal pelo handle
  const chRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=invistaemleiloes&key=${apiKey}`
  );
  const chData = await chRes.json();
  const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });

  // 2. Busca os últimos 50 vídeos
  const plRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=50&key=${apiKey}`
  );
  const plData = await plRes.json();
  const items: YTItem[] = plData.items || [];

  let criados = 0;
  for (const item of items) {
    const { snippet } = item;
    const videoId = snippet.resourceId.videoId;

    // Pula se já existe
    const existe = await countByVideoId(videoId);
    if (existe > 0) continue;

    const imagem =
      snippet.thumbnails?.maxres?.url ||
      snippet.thumbnails?.high?.url    ||
      snippet.thumbnails?.medium?.url  || "";

    const descFull = snippet.description || "";
    const resumo   = descFull.split("\n").find((l) => l.trim().length > 20) || descFull.slice(0, 200);
    const data     = snippet.publishedAt.slice(0, 10);

    await createPost({
      slug:      `${slugify(snippet.title)}-${videoId}`,
      titulo:    snippet.title,
      resumo:    resumo.slice(0, 300),
      conteudo:  `[youtube:${videoId}]\n\n${descFull}`,
      imagem,
      data,
      leitura:   estimarLeitura(descFull),
      tipo:      "youtube",
      videoId,
      publicado: false,
    });
    criados++;
  }

  revalidatePath("/blog");
  return NextResponse.json({ criados, total: items.length });
}
