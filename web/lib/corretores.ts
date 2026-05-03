import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";

export type CategoriaCorretor = "credenciado_caixa" | "corretor_geral";

export interface Corretor {
  _id: string;
  slug: string;
  nome: string;
  foto?: string;
  categoria: CategoriaCorretor;
  creci: string;
  cidade: string;
  estado: string;
  bio: string;
  especialidades: string[];
  whatsapp?: string;
  instagram?: string;
  email?: string;
  website?: string;
  aprovado: boolean;
  criadoEm: string;
}

const COLL = "corretores";

async function col() {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB).collection(COLL);
}

export function slugifyNome(nome: string, creci: string) {
  const base = nome
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base}-${creci.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

export async function getCorretoresAprovados(): Promise<Corretor[]> {
  const c = await col();
  const docs = await c.find({ aprovado: true }).sort({ nome: 1 }).toArray();
  return docs.map((d) => ({ ...d, _id: d._id.toString() })) as Corretor[];
}

export async function getCorretorBySlug(slug: string): Promise<Corretor | null> {
  const c = await col();
  const doc = await c.findOne({ slug, aprovado: true });
  if (!doc) return null;
  return { ...doc, _id: doc._id.toString() } as Corretor;
}

export async function getAllCorretores(): Promise<Corretor[]> {
  const c = await col();
  const docs = await c.find({}).sort({ criadoEm: -1 }).toArray();
  return docs.map((d) => ({ ...d, _id: d._id.toString() })) as Corretor[];
}

export async function createCorretor(data: Omit<Corretor, "_id">): Promise<string> {
  const c = await col();
  const result = await c.insertOne({ ...data, criadoEm: new Date().toISOString() });
  return result.insertedId.toString();
}

export async function updateCorretor(id: string, data: Partial<Corretor>): Promise<void> {
  const c = await col();
  const { _id, criadoEm, ...safe } = data as Corretor;
  void _id; void criadoEm;
  await c.updateOne({ _id: new ObjectId(id) }, { $set: safe });
}

export async function deleteCorretor(id: string): Promise<void> {
  const c = await col();
  await c.deleteOne({ _id: new ObjectId(id) });
}
