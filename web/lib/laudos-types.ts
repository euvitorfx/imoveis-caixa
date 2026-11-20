// Tipos e constantes puros — sem dependência do MongoDB
// Pode ser importado por Client Components

export type LaudoStatus =
  | "aguardando_pagamento"
  | "pago"
  | "em_producao"
  | "entregue"
  | "cancelado";

export type BlocoStatus = "pendente" | "em_andamento" | "concluido";

export interface BlocoLaudo {
  status: BlocoStatus;
  conteudo?: string;
  atualizadoEm?: string;
}

export interface Laudo {
  _id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  imovelId: string;
  imovelDescricao: string;
  imovelData: Record<string, unknown>;
  nivel: 1 | 2;
  preco: number; // centavos: 9700 | 29700
  status: LaudoStatus;
  numero?: number; // sequencial global: #0001, #0002...
  mpPaymentId?: string;
  paidAt?: string;
  criadoEm: string;
  atualizadoEm: string;
  blocos: {
    mercado: BlocoLaudo;
    matricula: BlocoLaudo;
    juridica: BlocoLaudo;
    viabilidade: BlocoLaudo;
    parecer?: BlocoLaudo;
  };
  observacoes?: string;
  pdfUrl?: string;
  userPhone?: string | null; // enriquecido pelo endpoint admin
  nps?: { nota: 1 | 2 | 3 | 4 | 5; comentario?: string; criadoEm: string };
  screenshotCaixaUrl?: string;
  fotosAdicionais?: string[];
  localizacao?: {
    enderecoMaps?: string;
    lat?: number;
    lng?: number;
  };
  proximidades?: Array<{
    categoria: string;
    nome: string;
    distanciaM: number;
  }>;
  avaliacaoMercado?: AvaliacaoMercado;
  analiseFinanceira?: AnaliseFinanceira;
}

export interface AnuncioComparavel {
  titulo: string;
  url: string;
  fonte: string;
  preco?: number;
  area?: number;
  quartos?: number;
  dataPublicacao?: string; // ISO date string
  relevancia: "endereco" | "bairro" | "regiao";
  imagemUrl?: string; // URL da foto principal do anúncio
}

export interface AvaliacaoMercado {
  anuncios: AnuncioComparavel[];
  buscadoEm: string;
  /** "manual" = inserido via Claude browser; "automatico" = Serper/Google CSE */
  source?: "manual" | "automatico";
  stats?: {
    min: number;
    max: number;
    mediana: number;
    total: number;
    precoM2?: number;
  };
}

export interface AnaliseFinanceira {
  // Referências de valor
  valorAvaliacao?: number;
  valorMercado?: number;
  arrematacao?: number;
  // Percentuais de aquisição
  leiloeiroPerc?: number;    // default 5
  escrituraPerc?: number;    // default 3
  itbiPerc?: number;         // default 2.5
  registroPerc?: number;     // default 3
  // Custos fixos de aquisição
  condominioPendente?: number;
  iptu?: number;
  imissaoPosse?: number;     // default 3000
  reforma?: number;          // default 20000
  areaNaoAverbada?: number;
  contabilidade?: number;    // default 1500
  anunciosPagos?: number;    // default 1000
  // Manutenção
  mesesManutencao?: number;  // default 5
  condominioMensal?: number;
  energiaMensal?: number;    // default 100
  aguaMensal?: number;       // default 100
  // Venda
  valorVenda?: number;
  corretorPerc?: number;     // default 8
  irPerc?: number;           // default 15
  assessoriaPerc?: number;   // default 50
  atualizadoEm?: string;
}

export const PRECOS: Record<1 | 2, number> = {
  1: 9700,
  2: 29700,
};

export const STATUS_LABEL: Record<LaudoStatus, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago — em fila",
  em_producao: "Em produção",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const BLOCO_LABEL: Record<string, string> = {
  mercado: "Análise de Mercado",
  matricula: "Análise da Matrícula",
  juridica: "Análise Jurídica",
  viabilidade: "Viabilidade Financeira",
  parecer: "Parecer Final do Especialista",
};

export function blocoVazio(): BlocoLaudo {
  return { status: "pendente" };
}
