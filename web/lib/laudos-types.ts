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
  };
  observacoes?: string;
  pdfUrl?: string;
  userPhone?: string | null; // enriquecido pelo endpoint admin
  nps?: { nota: 1 | 2 | 3 | 4 | 5; comentario?: string; criadoEm: string };
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

export const BLOCO_LABEL: Record<keyof Laudo["blocos"], string> = {
  mercado: "Análise de Mercado",
  matricula: "Análise da Matrícula",
  juridica: "Análise Jurídica",
  viabilidade: "Viabilidade Financeira",
};

export function blocoVazio(): BlocoLaudo {
  return { status: "pendente" };
}
