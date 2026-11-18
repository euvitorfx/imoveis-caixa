import { NextRequest, NextResponse } from "next/server";
import { getLaudoById, updateLaudo } from "@/lib/laudos";
import { analisarMatricula } from "@/lib/analise-matricula";
import { uploadMatricula } from "@/lib/r2";
import clientPromise from "@/lib/mongodb";
import { pesquisarProcessos, formatarResultadoJuridico, serializarProcessosParaContexto } from "@/lib/pesquisa-juridica";
import type { ResultadoPesquisaJuridica } from "@/lib/pesquisa-juridica";
import Anthropic from "@anthropic-ai/sdk";

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
    { projection: { matriculaUrl: 1, matriculaPdfR2Url: 1, urlDetalhe: 1, hdnImovel: 1, cidade: 1, estado: 1, tipo: 1, averbacaoLeiloes: 1, ocupacao: 1, modalidade: 1, fotoUrl: 1 } }
  );

  // 1. Tenta PDF já no R2 (evita re-download da Caixa)
  const r2PdfUrl: string | undefined =
    (imovel?.matriculaPdfR2Url as string | undefined) ??
    ((laudo as unknown as Record<string, unknown>).matriculaPdfR2Url as string | undefined);

  // 2. Tenta matrícula já conhecida (banco ou snapshot do laudo)
  let matriculaUrl: string | undefined = r2PdfUrl ??
    (imovel?.matriculaUrl as string | undefined) ??
    (laudo.imovelData?.matriculaUrl as string | undefined);

  // 3. Se não tiver, busca ao vivo na página de detalhe da Caixa
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

  // Extrai somente os campos estruturados para pesquisa jurídica (sem os markdowns longos)
  const { resumoMatricula: _rm, resumoJuridico: _rj, parecerFinal: _pf, uso: _uso, ...analiseJsonParaSalvar } = analise;

  // Salva análise no imóvel para reuso por outros laudos do mesmo imóvel
  if (imovel?._id) {
    await db.collection("imoveis").updateOne(
      { _id: imovel._id as unknown as import("mongodb").ObjectId },
      {
        $set: {
          analiseMatriculaCache: {
            json: analiseJsonParaSalvar,
            resumoMatricula: analise.resumoMatricula,
            resumoJuridico: analise.resumoJuridico,
            parecerFinal: analise.parecerFinal,
            analisadoEm: agora,
          },
        },
      }
    );
  }

  await updateLaudo(id, {
    ...(matriculaPdfR2Url ? { matriculaPdfR2Url } : {}),
    analiseMatriculaJson: analiseJsonParaSalvar,
    blocos: {
      ...laudo.blocos,
      matricula: { status: "concluido", conteudo: analise.resumoMatricula, atualizadoEm: agora },
      juridica:  { status: "concluido", conteudo: analise.resumoJuridico,  atualizadoEm: agora },
      parecer:   { status: "concluido", conteudo: analise.parecerFinal,    atualizadoEm: agora },
    },
    analisesIA: [...historicoAtual, novaEntradaIA],
  } as Parameters<typeof updateLaudo>[1]);

  // ── Auto-popular fotos e screenshot ──────────────────────────────────────
  // Busca fotos da Caixa pelo padrão /fotos/F{hdn}2N.jpg (HEAD em paralelo).
  // Idempotente: só executa se ainda não houver dados salvos.
  if (hdnImovel && !laudo.screenshotCaixaUrl && !(laudo.fotosAdicionais?.length)) {
    // Foto principal: prefere URL R2 (já migrada), cai na Caixa se não tiver
    const fotoUrlR2 = (imovel?.fotoUrl as string | undefined) ??
      (laudo.imovelData?.fotoUrl as string | undefined);

    // Busca fotos extras F{hdn}22.jpg … F{hdn}28.jpg na Caixa
    // (a F21 = foto principal já está no fotoUrlR2)
    const fotosExtras: string[] = [];
    const candidatos = Array.from({ length: 7 }, (_, i) =>
      `${CAIXA_BASE_URL}/fotos/F${hdnImovel}2${i + 2}.jpg`
    );
    const checks = await Promise.allSettled(
      candidatos.map((url) =>
        fetch(url, { method: "HEAD", headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(6000) })
          .then((r) => (r.ok ? url : null))
          .catch(() => null)
      )
    );
    for (const c of checks) {
      if (c.status === "fulfilled" && c.value) fotosExtras.push(c.value);
    }

    // Se não tiver fotoUrlR2, pega a F21 da Caixa como principal
    let fotoMain = fotoUrlR2;
    if (!fotoMain) {
      const r21 = await fetch(`${CAIXA_BASE_URL}/fotos/F${hdnImovel}21.jpg`, {
        method: "HEAD", headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(6000),
      }).catch(() => null);
      if (r21?.ok) fotoMain = `${CAIXA_BASE_URL}/fotos/F${hdnImovel}21.jpg`;
    }

    if (fotoMain || fotosExtras.length > 0) {
      await updateLaudo(id, {
        ...(fotoMain ? { screenshotCaixaUrl: fotoMain } : {}),
        fotosAdicionais: fotosExtras,
      } as Parameters<typeof updateLaudo>[1]);
    }
  }

  // ── Pesquisa jurídica automática ──────────────────────────────────────────
  // Extrai pessoas com CPF da análise e busca processos
  const pessoasParaPesquisar = new Map<string, string>();
  for (const p of analise.pessoas ?? []) {
    if (p.cpf) pessoasParaPesquisar.set(p.cpf, p.nome);
    if (p.conjugeCpf && p.conjugeNome) pessoasParaPesquisar.set(p.conjugeCpf, p.conjugeNome);
  }

  if (pessoasParaPesquisar.size > 0 && process.env.CONSULTADEPROCESSOS_API_KEY) {
    const resultadosPesquisa: ResultadoPesquisaJuridica[] = [];
    for (const [cpf, nome] of pessoasParaPesquisar.entries()) {
      const res = await pesquisarProcessos(cpf, nome);
      resultadosPesquisa.push(res);
    }

    const temProcessos = resultadosPesquisa.some(r => r.total > 0);

    // Gera seção de impacto com Claude se houver processos
    let secaoImpacto = "";
    if (temProcessos) {
      const contextoProcessos = serializarProcessosParaContexto(resultadosPesquisa);
      const clienteIA = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const resImpacto = await clienteIA.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: `Você é especialista em direito imobiliário e leilões da Caixa Econômica Federal. Os seguintes processos foram encontrados em nome dos devedores de um imóvel em leilão:

${contextoProcessos}

Contexto do imóvel: ${analise.endereco ?? ""} — ${analise.municipio ?? ""}

Para cada processo listado acima, escreva uma análise objetiva em Markdown com:
1. Se o processo pode impactar a arrematação (SIM / NÃO / RISCO BAIXO)
2. O motivo (em 1-3 frases)
3. O que o arrematante deve fazer (se aplicável)

Formato esperado:
## Análise de Impacto dos Processos na Arrematação

### [número do processo]
- **Impacto:** SIM / NÃO / RISCO BAIXO
- **Análise:** ...
- **Recomendação:** ...

Seja direto e técnico. Foque em processos que possam questionar a consolidação, penhorar o imóvel ou gerar ônus ao arrematante. Processos trabalhistas arquivados ou cíveis sem relação com o imóvel têm impacto mínimo — diga isso claramente.`,
        }],
      });

      const blocoImpacto = resImpacto.content.find(b => b.type === "text");
      secaoImpacto = blocoImpacto?.type === "text" ? blocoImpacto.text : "";

      // Registra consumo da chamada de impacto
      const entradaImpacto = {
        tipo: "impacto_processos",
        modelo: "claude-opus-5-5",
        inputTokens: resImpacto.usage.input_tokens,
        outputTokens: resImpacto.usage.output_tokens,
        custoUSD: +(resImpacto.usage.input_tokens * 4 / 1_000_000 + resImpacto.usage.output_tokens * 20 / 1_000_000).toFixed(6),
        em: agora,
      };
      await updateLaudo(id, {
        analisesIA: [...((laudo as unknown as Record<string, unknown>).analisesIA as typeof entradaImpacto[] ?? []), novaEntradaIA, entradaImpacto],
      } as Parameters<typeof updateLaudo>[1]);
    }

    // Monta bloco jurídica: análise AI + impacto + processos detalhados
    const markdownProcessos = formatarResultadoJuridico(resultadosPesquisa);
    const juridicaCompleta = [
      analise.resumoJuridico,
      secaoImpacto ? `\n\n---\n\n${secaoImpacto}` : "",
      `\n\n---\n\n${markdownProcessos}`,
    ].join("");

    await updateLaudo(id, {
      blocos: {
        ...laudo.blocos,
        juridica: { status: "concluido", conteudo: juridicaCompleta, atualizadoEm: agora },
      },
      pesquisaJuridicaEm: agora,
    } as Parameters<typeof updateLaudo>[1]);
  }

  return NextResponse.json({ ok: true, analise });
}
