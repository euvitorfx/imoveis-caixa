import { NextRequest, NextResponse } from "next/server";
import { getLaudoById, updateLaudo } from "@/lib/laudos";
import { pesquisarProcessos, formatarResultadoJuridico } from "@/lib/pesquisa-juridica";

type Ctx = { params: Promise<{ id: string }> };

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

// POST /api/admin/laudos/[id]/pesquisa-juridica
// Pesquisa processos judiciais das pessoas identificadas na análise de matrícula.
// Body opcional: { pessoas: [{nome, cpfCnpj}] }
// Se não vier no body, lê do analiseMatriculaJson salvo no laudo.
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  if (!process.env.CONSULTADEPROCESSOS_API_KEY) {
    return NextResponse.json({ error: "CONSULTADEPROCESSOS_API_KEY não configurada." }, { status: 500 });
  }

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  // Resolve lista de pessoas a pesquisar
  let pessoas: { nome: string; cpfCnpj: string }[] = [];

  const body = await req.json().catch(() => ({})) as { pessoas?: { nome: string; cpfCnpj: string }[] };

  if (body.pessoas?.length) {
    pessoas = body.pessoas;
  } else {
    // Tenta extrair do JSON completo da última análise de matrícula
    const analiseJson = (laudo as unknown as Record<string, unknown>).analiseMatriculaJson as
      { pessoas?: { nome: string; cpf?: string; qualificacao?: string }[] } | undefined;

    if (analiseJson?.pessoas?.length) {
      pessoas = analiseJson.pessoas
        .filter((p) => p.cpf)
        .map((p) => ({ nome: p.nome, cpfCnpj: p.cpf! }));
    }
  }

  if (!pessoas.length) {
    return NextResponse.json(
      { error: "Nenhuma pessoa com CPF/CNPJ encontrada. Informe no body ou execute a análise de matrícula primeiro." },
      { status: 400 }
    );
  }

  // Pesquisa cada pessoa (sequencial para não sobrecarregar a API)
  const resultados = [];
  for (const p of pessoas) {
    const resultado = await pesquisarProcessos(p.cpfCnpj, p.nome);
    resultados.push(resultado);
  }

  // Formata como Markdown e adiciona ao bloco jurídica
  const markdown = formatarResultadoJuridico(resultados);
  const agora = new Date().toISOString();

  // Concatena ao conteúdo jurídico existente (análise de matrícula + processos)
  const conteudoExistente = laudo.blocos?.juridica?.conteudo ?? "";
  const separador = conteudoExistente ? "\n\n---\n\n" : "";
  const novoConteudo = conteudoExistente + separador + markdown;

  await updateLaudo(id, {
    blocos: {
      ...laudo.blocos,
      juridica: { status: "concluido", conteudo: novoConteudo, atualizadoEm: agora },
    },
    pesquisaJuridicaEm: agora,
  } as Parameters<typeof updateLaudo>[1]);

  return NextResponse.json({ ok: true, resultados, totalPesquisados: pessoas.length });
}
