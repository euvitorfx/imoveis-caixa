import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";
export type {
  LaudoStatus,
  BlocoStatus,
  BlocoLaudo,
  Laudo,
} from "./laudos-types";
export { PRECOS, STATUS_LABEL, BLOCO_LABEL, blocoVazio } from "./laudos-types";
import type { Laudo } from "./laudos-types";

function col() {
  return clientPromise.then((c) =>
    c.db(process.env.MONGODB_DB).collection<Omit<Laudo, "_id"> & { _id?: ObjectId }>("laudos")
  );
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

export async function getLaudoByMpPaymentId(paymentId: string): Promise<Laudo | null> {
  const c = await col();
  const doc = await c.findOne({ mpPaymentId: paymentId });
  if (!doc) return null;
  return { ...doc, _id: doc._id!.toString() } as unknown as Laudo;
}
