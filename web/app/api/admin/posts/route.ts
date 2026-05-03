import { NextRequest, NextResponse } from "next/server";
import { getAllPosts, createPost } from "@/lib/blog";
import { revalidatePath } from "next/cache";

export async function GET() {
  const posts = await getAllPosts();
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = await createPost({
    slug:      body.slug,
    titulo:    body.titulo,
    resumo:    body.resumo,
    conteudo:  body.conteudo,
    imagem:    body.imagem || undefined,
    data:      body.data,
    leitura:   body.leitura || "5 min",
    tipo:      body.tipo || "manual",
    videoId:   body.videoId || undefined,
    publicado: body.publicado ?? false,
  });
  revalidatePath("/blog");
  return NextResponse.json({ id });
}
