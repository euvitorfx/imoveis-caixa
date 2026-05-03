import { NextRequest, NextResponse } from "next/server";
import { createCorretor, slugifyNome } from "@/lib/corretores";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nome, creci, categoria, cidade, estado, bio, especialidades, whatsapp, instagram, email, website, foto } = body;

  if (!nome || !creci || !categoria || !cidade || !estado) {
    return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });
  }

  const id = await createCorretor({
    slug:         slugifyNome(nome, creci),
    nome,
    creci,
    categoria,
    cidade,
    estado,
    bio:          bio || "",
    especialidades: especialidades || [],
    whatsapp:     whatsapp || undefined,
    instagram:    instagram || undefined,
    email:        email || undefined,
    website:      website || undefined,
    foto:         foto || undefined,
    aprovado:     false,
    criadoEm:     new Date().toISOString(),
  });

  return NextResponse.json({ id });
}
