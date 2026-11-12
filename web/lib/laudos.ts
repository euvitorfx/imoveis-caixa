import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";

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
  imovelDescricao: string; // "Casa em São Paulo/SP"
  imovelData: Record<string, unknown>; // snapshot do imóvel
  nivel: 1 | 2; // 1 = R$97 digital, 2 = R$297 + call
  preco: number; // em centavos: 9700 | 29700
  status: LaudoStatus;
  pagarmeOrderId?: string;
  pagarmeChargeId?: string;
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
}

function col() {
  return clientPromise.then((c) =>
    c.db(process.env.MONGODB_DB).collection<Omit<Laudo, "_id"> & { _id?: ObjectId }>("laudos")
  );
}

export function blocoVazio(): BlocoLaudo {
  return { status: "pendente" };
}

export async function createLaudo(data: Omit<Laudo, "_id">): Promise<string> {
  const c = await col();
  const result = await c.insertOne(data as Omit<Laudo, "_id"> & { _id?: ObjectId });
  return result.insertedId.toString();
}

export async function getLaudoById(id: string): Promise<Laudo | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await col();
  const doc = await c.findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  return { ...doc, _id: doc._id!.toString() } as unknown as Laudo;
}

export async function getLaudosByUser(userId: string): Promise<Laudo[]> {
  const c = await col();
  const docs = await c.find({ userId }).sort({ criadoEm: -1 }).toArray();
  return docs.map((d) => ({ ...d, _id: d._id!.toString() }) as unknown as Laudo);
}

export async function getLaudosAdmin(limit = 100): Promise<Laudo[]> {
  const c = await col();
  const docs = await c.find({}).sort({ criadoEm: -1 }).limit(limit).toArray();
  return docs.map((d) => ({ ...d, _id: d._id!.toString() }) as unknown as Laudo);
}

export async function updateLaudo(id: string, update: Partial<Laudo>): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const c = await col();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...rest } = update;
  await c.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...rest, atualizadoEm: new Date().toISOString() } }
  );
}

export async function getLaudoByPagarmeOrderId(orderId: string): Promise<Laudo | null> {
  const c = await col();
  const doc = await c.findOne({ pagarmeOrderId: orderId });
  if (!doc) return null;
  return { ...doc, _id: doc._id!.toString() } as unknown as Laudo;
}

export const PRECOS: Record<1 | 2, number> = {
  1: 9700,  // R$97,00
  2: 29700, // R$297,00
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
