const BASE = "https://consultadeprocessos.com.br/api/partner/v2";

export interface ProcessoJuridico {
  number: string;
  type?: string;
  courtType?: string;
  mainSubject?: string;
  courtName?: string;
  state?: string;
  status?: string;
  documentPolarity?: "ACTIVE" | "PASSIVE" | "NEUTRAL";
  value?: number;
  noticeDate?: string;
  lastMovementDate?: string;
  author?: string;
  reu?: string;
  aiSummary?: string;
}

export interface ResultadoPesquisaJuridica {
  cpfCnpj: string;
  nome: string;
  total: number;
  processos: ProcessoJuridico[];
  totaisTribunal: Record<string, number>;
  totaisPolo: Record<string, number>;
  erro?: string;
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.CONSULTADEPROCESSOS_API_KEY}`,
    "Content-Type": "application/json",
  };
}

/** Remove formatação do CPF/CNPJ, deixa só números */
function soNumeros(doc: string) {
  return doc.replace(/\D/g, "");
}

/** Cria consulta e aguarda resultado (polling a cada 2s, timeout 60s). */
export async function pesquisarProcessos(
  cpfCnpj: string,
  nome: string
): Promise<ResultadoPesquisaJuridica> {
  const doc = soNumeros(cpfCnpj);

  // Passo 1 — cria a consulta
  const criacao = await fetch(`${BASE}/lawsuits/document`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ document: doc }),
  });

  if (!criacao.ok) {
    const txt = await criacao.text().catch(() => "");
    return { cpfCnpj, nome, total: 0, processos: [], totaisTribunal: {}, totaisPolo: {}, erro: `HTTP ${criacao.status}: ${txt.slice(0, 200)}` };
  }

  const { requestId } = (await criacao.json()) as { requestId: string };

  // Passo 2 — polling até done ou error (máx 60s)
  const limite = Date.now() + 60_000;
  let resultado: { status: string; total?: number; lawsuits?: ProcessoJuridico[]; courtTypeTotals?: Record<string, number>; polarityTotals?: Record<string, number> } | null = null;

  while (Date.now() < limite) {
    await new Promise((r) => setTimeout(r, 2500));
    const poll = await fetch(
      `${BASE}/lawsuits/document/${requestId}?perPage=100&includeAiSummary=true`,
      { headers: headers() }
    );
    if (!poll.ok) continue;
    resultado = await poll.json();
    if (resultado?.status === "done" || resultado?.status === "error") break;
  }

  if (!resultado || resultado.status === "error") {
    return { cpfCnpj, nome, total: 0, processos: [], totaisTribunal: {}, totaisPolo: {}, erro: "Consulta não finalizou no tempo esperado." };
  }

  return {
    cpfCnpj,
    nome,
    total: resultado.total ?? 0,
    processos: resultado.lawsuits ?? [],
    totaisTribunal: resultado.courtTypeTotals ?? {},
    totaisPolo: resultado.polarityTotals ?? {},
  };
}

/** Formata resultado de pesquisa jurídica como Markdown para o laudo. */
export function formatarResultadoJuridico(resultados: ResultadoPesquisaJuridica[]): string {
  const linhas: string[] = ["## Pesquisa de Processos Judiciais\n"];

  for (const r of resultados) {
    linhas.push(`### ${r.nome}`);
    linhas.push(`**CPF/CNPJ:** ${r.cpfCnpj}\n`);

    if (r.erro) {
      linhas.push(`> ⚠️ Erro na consulta: ${r.erro}\n`);
      continue;
    }

    if (r.total === 0) {
      linhas.push(`**Resultado:** Nenhum processo encontrado.\n`);
      continue;
    }

    linhas.push(`**Total de processos:** ${r.total}`);

    const tribunais = Object.entries(r.totaisTribunal)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
    if (tribunais) linhas.push(`**Por área:** ${tribunais}`);

    const polos = Object.entries(r.totaisPolo)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k === "ACTIVE" ? "Autor" : k === "PASSIVE" ? "Réu" : "Neutro"}: ${v}`)
      .join(" · ");
    if (polos) linhas.push(`**Por polo:** ${polos}\n`);

    // Lista até 10 processos mais recentes
    const lista = r.processos.slice(0, 10);
    for (const p of lista) {
      const data = p.lastMovementDate ? new Date(p.lastMovementDate).toLocaleDateString("pt-BR") : "–";
      const polo = p.documentPolarity === "ACTIVE" ? "**Autor**" : p.documentPolarity === "PASSIVE" ? "**Réu**" : "Neutro";
      linhas.push(`**${p.number}**`);
      linhas.push(`- Área: ${p.courtType ?? "–"} · Tribunal: ${p.courtName ?? "–"} · ${p.state ?? ""}`);
      linhas.push(`- Assunto: ${p.mainSubject ?? "–"}`);
      linhas.push(`- Polo: ${polo} · Status: ${p.status ?? "–"} · Última mov.: ${data}`);
      if (p.aiSummary) linhas.push(`- Resumo IA: ${p.aiSummary}`);
      linhas.push("");
    }

    if (r.total > 10) {
      linhas.push(`_... e mais ${r.total - 10} processo(s) não exibidos._\n`);
    }
  }

  return linhas.join("\n");
}
