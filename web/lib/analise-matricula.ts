import Anthropic from "@anthropic-ai/sdk";

export interface PessoaMatricula {
  nome: string;
  cpf?: string;
  qualificacao?: string; // "ex-mutuário", "cônjuge", "fiduciante"
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

  // Meta
  limitacoes: string[];      // O que não foi possível verificar
  uso?: UsoTokens;           // preenchido pelo helper, não pelo Claude
}

export async function analisarMatricula(
  pdfBase64: string,
  contexto?: { cidade?: string; estado?: string; tipo?: string }
): Promise<AnaliseMatricula> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const ctx = contexto
    ? `Contexto do imóvel: ${contexto.tipo ?? ""} em ${contexto.cidade ?? ""}/${contexto.estado ?? ""}.`
    : "";

  const prompt = `Você é um especialista em direito imobiliário e registral brasileiro. Analise esta matrícula de imóvel e extraia as informações em formato JSON estruturado.

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
      "qualificacao": "ex-mutuário | cônjuge | fiduciante | credor | outro"
    }
  ],
  "atos": [
    {
      "identificador": "R-1 / AV-2 / etc",
      "tipo": "string",
      "data": "string ou null",
      "descricao": "string resumida",
      "partes": ["array de nomes"]
    }
  ],
  "gravames": [
    {
      "tipo": "penhora | hipoteca | alienação fiduciária | indisponibilidade | outro",
      "status": "ativo | cancelado | indeterminado",
      "descricao": "string",
      "dataRegistro": "string ou null",
      "credor": "string ou null"
    }
  ],
  "alienacaoFiduciaria": {
    "registrada": true/false,
    "consolidada": true/false,
    "credor": "string ou null",
    "dataConsolidacao": "string ou null",
    "observacoes": "string ou null"
  },
  "alertas": [
    {
      "gravidade": "critico | alto | medio | baixo",
      "descricao": "string clara e objetiva"
    }
  ],
  "resumoMatricula": "Texto em Markdown com análise completa da situação registral. Inclua: titular atual, cadeia dominial resumida, gravames ativos, situação da alienação fiduciária e conclusão.",
  "resumoJuridico": "Texto em Markdown com análise jurídica. Inclua: pessoas identificadas com CPFs, processos mencionados na matrícula, riscos jurídicos identificados e recomendações.",
  "limitacoes": ["array de strings — o que não foi possível verificar ou estava ilegível"]
}

REGRAS IMPORTANTES:
- Nunca invente dados. Se não encontrar, use null.
- CPF: extraia exatamente como aparece no documento.
- Inclua TODOS os atos registrais (R-1, R-2, AV-1, AV-2, etc.).
- Se a matrícula mencionar processos judiciais, liste nos alertas e no resumo jurídico.
- Seja rigoroso: não classifique gravame como cancelado sem evidência explícita na matrícula.`;

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
