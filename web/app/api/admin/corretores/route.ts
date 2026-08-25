import { NextRequest, NextResponse } from "next/server";
import { getAllCorretores, createCorretor, slugifyNome } from "@/lib/corretores";
import type { CategoriaCorretor, TipoPessoa, Assessoramento, StatusRelacionamento, ExclusividadeStatus } from "@/lib/corretores";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const corretores = await getAllCorretores();
  return NextResponse.json(corretores);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    nome, creci, categoria, cidade, estado, bio, especialidades,
    whatsapp, instagram, email, website, foto,
    tipo_pessoa, assessoramento, nota_caixa,
    status_relacionamento, exclusividade,
    cidades_cobertura, observacoes_internas, origem, id_legado,
    aprovado,
    userId,
  } = body;

  if (!nome || !creci || !estado) {
    return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });
  }

  // Verifica se já existe corretor vinculado a esse usuário
  if (userId) {
    const client = await clientPromise;
    const existente = await client
      .db(process.env.MONGODB_DB)
      .collection("corretores")
      .findOne({ userId });
    if (existente) {
      return NextResponse.json(
        { error: `Usuário já é corretor parceiro (${existente.nome})` },
        { status: 409 }
      );
    }
  }

  const id = await createCorretor({
    slug:                   slugifyNome(nome, creci),
    nome,
    creci,
    categoria:              (categoria as CategoriaCorretor) || "corretor_geral",
    cidade:                 cidade || "",
    estado,
    bio:                    bio || "",
    especialidades:         especialidades || [],
    whatsapp:               whatsapp || undefined,
    instagram:              instagram || undefined,
    email:                  email || undefined,
    website:                website || undefined,
    foto:                   foto || undefined,
    aprovado:               aprovado === true,
    criadoEm:               new Date().toISOString(),
    tipo_pessoa:            (tipo_pessoa as TipoPessoa) || undefined,
    assessoramento:         (assessoramento as Assessoramento) || undefined,
    nota_caixa:             nota_caixa ? Number(nota_caixa) : undefined,
    status_relacionamento:  (status_relacionamento as StatusRelacionamento) || "sem_resposta",
    exclusividade:          (exclusividade as ExclusividadeStatus) || "em_analise",
    cidades_cobertura:      cidades_cobertura || [],
    observacoes_internas:   observacoes_internas || undefined,
    origem:                 origem || undefined,
    id_legado:              id_legado ? Number(id_legado) : undefined,
    userId:                 userId || undefined,
  });

  return NextResponse.json({ id });
}
