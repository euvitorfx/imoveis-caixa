import { NextRequest, NextResponse } from "next/server";
import { getLaudoById, updateLaudo } from "@/lib/laudos";
import { analisarMatricula } from "@/lib/analise-matricula";
import { uploadMatricula } from "@/lib/r2";
import clientPromise from "@/lib/mongodb";

const CAIXA_BASE_URL = "https://venda-imoveis.caixa.gov.br";

/** Busca a URL da matrícula PDF na página de detalhe da Caixa. */
async function buscarMatriculaUrlNaCaixa(urlDetalhe: string): Promise<string | null> {
  try {
    const res = await fetch(urlDetalhe, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/ExibeDoc\(['"]([^'"]*matricula[^'"]*\.pdf)['"]/i);
    if (!match) return null;
    const path = match[1];
    return path.startsWith("/") ? `${CAIXA_BASE_URL}${path}` : path;
  } catch {
    return null;
  }
}

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
    { projection: { matriculaUrl: 1, urlDetalhe: 1, hdnImovel: 1, cidade: 1, estado: 1, tipo: 1, averbacaoLeiloes: 1, ocupacao: 1, modalidade: 1 } }
  );

  // 1. Tenta matrícula já conhecida (banco ou snapshot do laudo)
  let matriculaUrl: string | undefined =
    (imovel?.matriculaUrl as string | undefined) ??
    (laudo.imovelData?.matriculaUrl as string | undefined);

  // 2. Se não tiver, busca ao vivo na página de detalhe da Caixa
  if (!matriculaUrl) {
    const urlDetalhe =
      (imovel?.urlDetalhe as string | undefined) ??
      (laudo.imovelData?.urlDetalhe as string | undefined) ??
      (laudo.imovelData?.hdnImovel
        ? `${CAIXA_BASE_URL}/sistema/detalhe-imovel.asp?hdnimovel=${laudo.imovelData.hdnImovel}`
        : undefined);

    if (urlDetalhe) {
      matriculaUrl = (await buscarMatriculaUrlNaCaixa(urlDetalhe)) ?? undefined;
    }

    if (matriculaUrl && imovel?._id) {
      // Persiste para não precisar buscar novamente
      await db.collection("imoveis").updateOne(
        { _id: imovel._id as unknown as import("mongodb").ObjectId },
        { $set: { matriculaUrl } }
      );
    }
  }

  if (!matriculaUrl) {
    return NextResponse.json(
      { error: "PDF de matrícula não encontrado na base de dados nem na página da Caixa." },
      { status: 400 }
    );
  }

  // Download do PDF
  let pdfBuffer: Buffer;
  let pdfBase64: string;
  try {
    const res = await fetch(matriculaUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    pdfBuffer = Buffer.from(await res.arrayBuffer());
    pdfBase64 = pdfBuffer.toString("base64");
  } catch (e) {
    return NextResponse.json(
      { error: `Falha ao baixar o PDF de matrícula: ${e instanceof Error ? e.message : e}` },
      { status: 502 }
    );
  }

  // Upload do PDF para o R2 (idempotente — não re-faz se já existir)
  const hdnImovel =
    (imovel?.hdnImovel as string | undefined) ??
    (laudo.imovelData?.hdnImovel as string | undefined);

  let matriculaPdfR2Url: string | undefined;
  if (hdnImovel) {
    try {
      matriculaPdfR2Url = await uploadMatricula(hdnImovel, pdfBuffer);
      // Persiste no imóvel para uso futuro (PDF gerado, pré-visualização, etc.)
      if (imovel?._id) {
        await db.collection("imoveis").updateOne(
          { _id: imovel._id as unknown as import("mongodb").ObjectId },
          { $set: { matriculaPdfR2Url } }
        );
      }
    } catch {
      // Falha no upload não bloqueia a análise
    }
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
    ...(matriculaPdfR2Url ? { matriculaPdfR2Url } : {}),
    blocos: {
      ...laudo.blocos,
      matricula: { status: "concluido", conteudo: analise.resumoMatricula, atualizadoEm: agora },
      juridica:  { status: "concluido", conteudo: analise.resumoJuridico,  atualizadoEm: agora },
    },
    analisesIA: [...historicoAtual, novaEntradaIA],
  } as Parameters<typeof updateLaudo>[1]);

  return NextResponse.json({ ok: true, analise });
}
