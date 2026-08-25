import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";

export type ProcessoStatus =
  | "aguardando_dados"
  | "em_analise"
  | "em_andamento"
  | "concluido"
  | "cancelado";

export interface ProcessoClube {
  _id: string;
  userId: string;
  corretorId: string;
  imovelId?: string;
  imovelNumero?: string;
  imovelDescricao?: string;
  numeroProcessoCaixa: string;
  status: ProcessoStatus;
  abertoPor: "comprador" | "corretor";
  valorComissaoBLC?: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ProcessoClubeEnriquecido extends ProcessoClube {
  compradorNome?: string;
  compradorEmail?: string;
  corretorNome?: string;
  corretorCreci?: string;
}

const COLL = "processos_clube";

async function col() {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB).collection(COLL);
}

export async function createProcesso(
  data: Omit<ProcessoClube, "_id" | "criadoEm" | "atualizadoEm">
): Promise<string> {
  const c = await col();
  const now = new Date().toISOString();
  const result = await c.insertOne({ ...data, criadoEm: now, atualizadoEm: now });
  return result.insertedId.toString();
}

export async function getProcessosByUser(userId: string): Promise<ProcessoClube[]> {
  const c = await col();
  const docs = await c.find({ userId }).sort({ criadoEm: -1 }).toArray();
  return docs.map((d) => ({ ...d, _id: d._id.toString() })) as ProcessoClube[];
}

export async function updateProcesso(id: string, data: Partial<ProcessoClube>): Promise<void> {
  const c = await col();
  await c.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...data, atualizadoEm: new Date().toISOString() } }
  );
}

export async function getAllProcessos(): Promise<ProcessoClubeEnriquecido[]> {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const docs = await db
    .collection(COLL)
    .aggregate([
      { $sort: { criadoEm: -1 } },
      {
        $lookup: {
          from: "users",
          let: { uid: { $toObjectId: "$userId" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$uid"] } } },
            { $project: { name: 1, email: 1 } },
          ],
          as: "comprador",
        },
      },
      {
        $lookup: {
          from: "corretores",
          let: { cid: { $toObjectId: "$corretorId" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$cid"] } } },
            { $project: { nome: 1, creci: 1 } },
          ],
          as: "corretor",
        },
      },
      {
        $addFields: {
          compradorNome:  { $arrayElemAt: ["$comprador.name",  0] },
          compradorEmail: { $arrayElemAt: ["$comprador.email", 0] },
          corretorNome:   { $arrayElemAt: ["$corretor.nome",   0] },
          corretorCreci:  { $arrayElemAt: ["$corretor.creci",  0] },
        },
      },
      { $unset: ["comprador", "corretor"] },
    ])
    .toArray();

  return docs.map((d) => ({ ...d, _id: d._id.toString() })) as ProcessoClubeEnriquecido[];
}
