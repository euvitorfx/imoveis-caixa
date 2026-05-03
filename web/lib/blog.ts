import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";

export interface BlogPost {
  _id: string;
  slug: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  imagem?: string;
  data: string;
  leitura: string;
  tipo: "manual" | "youtube";
  videoId?: string;
  publicado: boolean;
  criadoEm?: string;
}

const COLL = "blog_posts";

async function col() {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB).collection(COLL);
}

export async function getPostsPublicados(): Promise<BlogPost[]> {
  const c = await col();
  const docs = await c.find({ publicado: true }).sort({ data: -1 }).toArray();
  return docs.map((d) => ({ ...d, _id: d._id.toString() })) as BlogPost[];
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const c = await col();
  const doc = await c.findOne({ slug, publicado: true });
  if (!doc) return null;
  return { ...doc, _id: doc._id.toString() } as BlogPost;
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const c = await col();
  const docs = await c.find({}).sort({ data: -1 }).toArray();
  return docs.map((d) => ({ ...d, _id: d._id.toString() })) as BlogPost[];
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  const c = await col();
  if (!ObjectId.isValid(id)) return null;
  const doc = await c.findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  return { ...doc, _id: doc._id.toString() } as BlogPost;
}

export async function createPost(data: Omit<BlogPost, "_id">): Promise<string> {
  const c = await col();
  const result = await c.insertOne({ ...data, criadoEm: new Date().toISOString() });
  return result.insertedId.toString();
}

export async function updatePost(id: string, data: Partial<BlogPost>): Promise<void> {
  const c = await col();
  await c.updateOne({ _id: new ObjectId(id) }, { $set: { ...data, atualizadoEm: new Date().toISOString() } });
}

export async function deletePost(id: string): Promise<void> {
  const c = await col();
  await c.deleteOne({ _id: new ObjectId(id) });
}

export async function countByVideoId(videoId: string): Promise<number> {
  const c = await col();
  return c.countDocuments({ videoId });
}

// Seed inicial com os 5 posts estáticos se o blog estiver vazio
export async function seedIfEmpty() {
  const c = await col();
  const total = await c.countDocuments();
  if (total > 0) return;

  const { POSTS } = await import("@/app/novidades/posts");
  await c.insertMany(
    POSTS.map((p) => ({
      slug:      p.slug,
      titulo:    p.titulo,
      resumo:    p.resumo,
      conteudo:  p.conteudo,
      imagem:    undefined,
      data:      p.data,
      leitura:   p.leitura,
      tipo:      "manual" as const,
      publicado: true,
      criadoEm:  new Date().toISOString(),
    }))
  );
}
