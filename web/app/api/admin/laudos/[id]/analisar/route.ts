import { NextRequest, NextResponse } from "next/server";
import { getLaudoById, updateLaudo } from "@/lib/laudos";
import { analisarMatricula } from "@/lib/analise-matricula";
import clientPromise from "@/lib/mongodb";

type Ctx = { params: Promise<{ id: string }> };

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

// POST /api/admin/laudos/[id]/analisar
// Faz download do PDF de matrícula e chama Claude API para análise
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  // Busca matriculaUrl no imovel (versão mais recente, não a snapshot do laudo)
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const imovel = await db.collection("imoveis").findOne(
    { _id: laudo.imovelId as unknown as import("mongodb").ObjectId },
    { projection: { matriculaUrl: 1, cidade: 1, estado: 1, tipo: 1, averbacaoLeiloes: 1, ocupacao: 1, modalidade: 1 } }
  );

  // Tenta também pelo stringId caso _id não bata diretamente
  const matriculaUrl: string | undefined =
    (imovel?.matriculaUrl as string | undefined) ??
    (laudo.imovelData?.matriculaUrl as string | undefined);

  if (!matriculaUrl) {
    return NextResponse.json(
      { error: "Este imóvel não possui PDF de matrícula cadastrado." },
      { status: 400 }
    );
  }

  // Download do PDF
  let pdfBase64: string;
  try {
    const res = await fetch(matriculaUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    pdfBase64 = Buffer.from(buffer).toString("base64");
  } catch (e) {
    return NextResponse.json(
      { error: `Falha ao baixar o PDF de matrícula: ${e instanceof Error ? e.message : e}` },
      { status: 502 }
    );
  }

  // Análise com Claude
  const analise = await analisarMatricula(pdfBase64, {
    cidade: imovel?.cidade as string | undefined ?? laudo.imovelData?.cidade as string | undefined,
    estado: imovel?.estado as string | undefined ?? laudo.imovelData?.uf as string | undefined,
    tipo: imovel?.tipo as string | undefined ?? laudo.imovelData?.tipo as string | undefined,
    dadosCaixa: {
      averbacaoLeiloes: imovel?.averbacaoLeiloes as string | undefined,
      ocupacao: imovel?.ocupacao as string | undefined ?? laudo.imovelData?.ocupacao as string | undefined,
      modalidade: imovel?.modalidade as string | undefined ?? laudo.imovelData?.modalidade as string | undefined,
    },
  });

  // Salva blocos + registro de consumo no laudo
  const agora = new Date().toISOString();
  const novaEntradaIA = {
    tipo: "matricula",
    modelo: analise.uso?.modelo ?? "claude-opus-5-5",
    inputTokens: analise.uso?.inputTokens ?? 0,
    outputTokens: analise.uso?.outputTokens ?? 0,
    custoUSD: analise.uso?.custoUSD ?? 0,
    em: agora,
  };

  // Acumula histórico de chamadas IA neste laudo
  const historicoAtual = (laudo as unknown as Record<string, unknown>).analisesIA as typeof novaEntradaIA[] | undefined ?? [];

  await updateLaudo(id, {
    blocos: {
      ...laudo.blocos,
      matricula: { status: "concluido", conteudo: analise.resumoMatricula, atualizadoEm: agora },
      juridica:  { status: "concluido", conteudo: analise.resumoJuridico,  atualizadoEm: agora },
    },
    analisesIA: [...historicoAtual, novaEntradaIA],
  } as Parameters<typeof updateLaudo>[1]);

  return NextResponse.json({ ok: true, analise });
}
