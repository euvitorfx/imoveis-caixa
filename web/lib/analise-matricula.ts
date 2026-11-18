import Anthropic from "@anthropic-ai/sdk";

export interface PessoaMatricula {
  nome: string;
  cpf?: string;
  qualificacao?: string; // "ex-mutuário", "cônjuge", "fiduciante"
  estadoCivil?: string;  // "solteiro" | "casado" | "divorciado" | "viúvo" | null
  conjugeNome?: string;
  conjugeCpf?: string;
}

export interface GravameMatricula {
  tipo: string;        // "penhora", "hipoteca", "alienação fiduciária", etc.
  status: "ativo" | "cancelado" | "indeterminado";
  descricao: string;
  dataRegistro?: string;
  credor?: string;
}

export interface AtoRegistral {
  identificador: string; // "R-1", "AV-3", etc.
  tipo: string;
  data?: string;
  descricao: string;
  partes?: string[];
}

// Preços claude-opus-5-5 (USD por token)
const PRECO_INPUT_POR_TOKEN  = 4.00  / 1_000_000;
const PRECO_OUTPUT_POR_TOKEN = 20.00 / 1_000_000;

export interface UsoTokens {
  inputTokens: number;
  outputTokens: number;
  custoUSD: number;      // custo total calculado
  modelo: string;
}

export interface AnaliseMatricula {
  // Identificação
  numeroMatricula?: string;
  cartorio?: string;
  municipio?: string;
  endereco?: string;
  area?: string;
  titularAtual?: string;

  // Pessoas encontradas
  pessoas: PessoaMatricula[];

  // Histórico
  atos: AtoRegistral[];

  // Gravames
  gravames: GravameMatricula[];

  // Alienação fiduciária
  alienacaoFiduciaria?: {
    registrada: boolean;
    consolidada: boolean;
    credor?: string;
    dataConsolidacao?: string;
    observacoes?: string;
  };

  // Alertas
  alertas: Array<{
    gravidade: "critico" | "alto" | "medio" | "baixo";
    descricao: string;
  }>;

  // Resumo para os blocos do laudo
  resumoMatricula: string;   // Markdown — vai para blocos.matricula.conteudo
  resumoJuridico: string;    // Markdown — vai para blocos.juridica.conteudo
  parecerFinal: string;      // Markdown — conclusão e recomendação do especialista

  // Meta
  limitacoes: string[];      // O que não foi possível verificar
  uso?: UsoTokens;           // preenchido pelo helper, não pelo Claude
}

export async function analisarMatricula(
  pdfBase64: string,
  contexto?: {
    cidade?: string;
    estado?: string;
    tipo?: string;
    dadosCaixa?: {
      averbacaoLeiloes?: string; // "Averbado" | "Não Averbado"
      ocupacao?: string;
      modalidade?: string;
    };
  }
): Promise<AnaliseMatricula> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const dadosCaixaStr = contexto?.dadosCaixa
    ? Object.entries(contexto.dadosCaixa)
        .filter(([, v]) => v)
        .map(([k, v]) => {
          const labels: Record<string, string> = {
            averbacaoLeiloes: "Averbação dos leilões negativos (site Caixa)",
            ocupacao: "Situação de ocupação (site Caixa)",
            modalidade: "Modalidade de venda (site Caixa)",
          };
          return `- ${labels[k] ?? k}: ${v}`;
        })
        .join("\n")
    : "";

  const ctx = [
    contexto?.tipo || contexto?.cidade || contexto?.estado
      ? `Imóvel: ${contexto.tipo ?? ""} em ${contexto.cidade ?? ""}/${contexto.estado ?? ""}.`
      : "",
    dadosCaixaStr
      ? `\nDados atuais do site da Caixa Econômica Federal (podem ser mais recentes que a matrícula):\n${dadosCaixaStr}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Você é um especialista em direito imobiliário e registral brasileiro com 20 anos de experiência em leilões da Caixa Econômica Federal. Analise esta matrícula com profundidade técnica e produza um laudo completo em formato JSON.

${ctx}

Retorne SOMENTE um JSON válido com esta estrutura exata (sem markdown, sem explicações fora do JSON):

{
  "numeroMatricula": "string ou null",
  "cartorio": "string ou null",
  "municipio": "string ou null",
  "endereco": "string ou null",
  "area": "string ou null",
  "titularAtual": "string ou null",
  "pessoas": [
    {
      "nome": "string",
      "cpf": "string ou null — formato XXX.XXX.XXX-XX se encontrado",
      "qualificacao": "ex-mutuário | cônjuge | fiduciante | credor | outro",
      "estadoCivil": "solteiro | casado | divorciado | viúvo | null — extraia da matrícula se mencionado",
      "conjugeNome": "string ou null — nome do cônjuge se o documento mencionar",
      "conjugeCpf": "string ou null — CPF do cônjuge se encontrado"
    }
  ],
  "atos": [
    {
      "identificador": "R-1 / AV-2 / etc",
      "tipo": "string",
      "data": "string ou null",
      "descricao": "string detalhada — inclua valores, partes e consequências jurídicas",
      "partes": ["array de nomes completos"]
    }
  ],
  "gravames": [
    {
      "tipo": "penhora | hipoteca | alienação fiduciária | indisponibilidade | outro",
      "status": "ativo | cancelado | indeterminado",
      "descricao": "string detalhada",
      "dataRegistro": "string ou null",
      "credor": "string ou null"
    }
  ],
  "alienacaoFiduciaria": {
    "registrada": true,
    "consolidada": true,
    "credor": "string ou null",
    "dataConsolidacao": "string ou null",
    "observacoes": "string detalhada sobre o processo de consolidação"
  },
  "alertas": [
    {
      "gravidade": "critico | alto | medio | baixo",
      "descricao": "string clara, objetiva e específica — cite números, datas e partes envolvidas"
    }
  ],
  "resumoMatricula": "## Análise Registral\\n\\nTexto COMPLETO e DETALHADO em Markdown. Deve incluir:\\n1. Identificação do imóvel (matrícula, cartório, endereço, área)\\n2. Histórico de propriedade (cadeia dominial desde o registro de abertura)\\n3. Todos os atos registrais relevantes com datas e partes\\n4. Situação atual da alienação fiduciária\\n5. Gravames ativos e cancelados\\n6. Situação do imóvel perante o registro de imóveis\\n\\nUse cabeçalhos (##, ###), negrito para dados importantes, e seja detalhado.",
  "resumoJuridico": "## Análise Jurídica\\n\\nTexto COMPLETO e DETALHADO em Markdown. Deve incluir:\\n1. Identificação de todas as pessoas (nome, CPF, qualificação, estado civil)\\n2. Se algum ex-mutuário for casado: analisar necessidade de outorga conjugal e riscos do cônjuge\\n3. Processos ou ações judiciais mencionados na matrícula\\n4. Riscos jurídicos identificados com análise fundamentada\\n5. Recomendações específicas para o arrematante\\n\\nUse cabeçalhos (##, ###), negrito para dados críticos.",
  "parecerFinal": "## Parecer Final do Especialista\\n\\nTexto objetivo e direto. Deve conter:\\n1. **Conclusão geral**: a situação jurídica/registral do imóvel é REGULAR, IRREGULAR ou CRÍTICA e por quê\\n2. **Pontos de atenção prioritários**: liste em ordem de importância os 2-3 principais riscos\\n3. **Recomendação de compra**: RECOMENDADO, RECOMENDADO COM RESSALVAS ou NÃO RECOMENDADO — com justificativa técnica\\n4. **Próximos passos**: o que o arrematante deve fazer antes e após a arrematação\\n\\nSeja direto e assertivo como um especialista que assina o laudo.",
  "limitacoes": ["array de strings — o que não foi possível verificar, estava ilegível ou requer confirmação externa"]
}

REGRAS TÉCNICAS OBRIGATÓRIAS:
- Nunca invente dados. Se não encontrar, use null.
- CPF: extraia exatamente como aparece no documento (formato XXX.XXX.XXX-XX).
- Inclua TODOS os atos registrais sem exceção (R-1, R-2, AV-1, AV-2, AV-3, etc.).
- Estado civil: procure termos como "casado", "solteiro", "divorciado", "viúvo", "outorga conjugal" em qualquer ato da matrícula. Se o ex-mutuário for casado, mencione expressamente o cônjuge.
- Cônjuge: se a matrícula mencionar cônjuge em qualquer ato (mesmo só o nome), extraia os dados em conjugeNome e conjugeCpf. Alerte sobre possíveis direitos do cônjuge sobre o imóvel.
- Alertas críticos: use "critico" para situações que impedem ou tornam altamente arriscada a compra (ação de nulidade, indisponibilidade ativa, grave irregularidade registral).
- Alertas altos: use "alto" para riscos significativos que exigem ação antes da arrematação.
- Alertas médios: use "medio" para situações que requerem verificação ou atenção mas não impedem a compra.
- Alertas baixos: use "baixo" para informações relevantes mas sem risco imediato.
- Gravames: só classifique como "cancelado" se houver ato de cancelamento/baixa explícito na matrícula.
- CRUZAMENTO COM DADOS DA CAIXA: Quando os "Dados atuais do site da Caixa" forem fornecidos acima, cruze-os obrigatoriamente com a matrícula. Divergências geram alerta específico explicando que a matrícula pode estar desatualizada e o que a Caixa declara. Nunca omita divergências — são informação crítica para o comprador.`;

  const MODEL = "claude-opus-5-5";

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16384,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock?.type === "text" ? textBlock.text : "";

  // Remove markdown code fences caso o modelo coloque
  const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

  let analise: AnaliseMatricula;
  try {
    analise = JSON.parse(cleaned) as AnaliseMatricula;
  } catch {
    throw new Error(`Falha ao parsear resposta do Claude: ${text.slice(0, 200)}`);
  }

  // Anexa dados de uso/custo
  const inputTokens  = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  analise.uso = {
    inputTokens,
    outputTokens,
    custoUSD: +(inputTokens * PRECO_INPUT_POR_TOKEN + outputTokens * PRECO_OUTPUT_POR_TOKEN).toFixed(6),
    modelo: MODEL,
  };

  return analise;
}
