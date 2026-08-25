import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";

export interface Afiliado {
  _id: string;
  nome: string;
  email: string;
  codigo: string;
  percentualComissao: number;
  ativo: boolean;
  userId?: string;
  criadoEm: string;
}

export interface ComissaoAfiliado {
  _id: string;
  afiliadoId: string;
  processoId: string;
  userId: string;
  valorComissaoBLC: number;
  valorAfiliado: number;
  percentual: number;
  status: "pendente" | "pago";
  criadoEm: string;
  pagoEm?: string;
}

export interface ReferidoLGPD {
  iniciais: string;
  cadastradoEm: string;
  temProcessoAtivo: boolean;
}

async function db() {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB);
}

export async function getAfiliadoByCodigo(codigo: string): Promise<Afiliado | null> {
  const database = await db();
  const doc = await database.collection("afiliados").findOne({ codigo: codigo.toUpperCase(), ativo: true });
  if (!doc) return null;
  return { ...doc, _id: doc._id.toString() } as Afiliado;
}

export async function getAfiliadoByUserId(userId: string): Promise<Afiliado | null> {
  const database = await db();
  const doc = await database.collection("afiliados").findOne({ userId });
  if (!doc) return null;
  return { ...doc, _id: doc._id.toString() } as Afiliado;
}

export async function getAllAfiliados(): Promise<Afiliado[]> {
  const database = await db();
  const docs = await database.collection("afiliados").find({}).sort({ criadoEm: -1 }).toArray();
  return docs.map((d) => ({ ...d, _id: d._id.toString() })) as Afiliado[];
}

export async function createAfiliado(
  data: Omit<Afiliado, "_id" | "criadoEm">
): Promise<string> {
  const database = await db();
  const result = await database.collection("afiliados").insertOne({
    ...data,
    criadoEm: new Date().toISOString(),
  });
  if (data.userId) {
    await database
      .collection("users")
      .updateOne(
        { _id: new ObjectId(data.userId) },
        { $set: { isAfiliado: true, afiliadoId: result.insertedId.toString() } }
      );
  }
  return result.insertedId.toString();
}

export async function updateAfiliado(id: string, data: Partial<Omit<Afiliado, "_id">>): Promise<void> {
  const database = await db();
  await database.collection("afiliados").updateOne({ _id: new ObjectId(id) }, { $set: data });
}

export async function getAllComissoes(): Promise<ComissaoAfiliado[]> {
  const database = await db();
  const docs = await database.collection("comissoes_afiliados").find({}).sort({ criadoEm: -1 }).toArray();
  return docs.map((d) => ({ ...d, _id: d._id.toString() })) as ComissaoAfiliado[];
}

export async function getComissoesByAfiliado(afiliadoId: string): Promise<ComissaoAfiliado[]> {
  const database = await db();
  const docs = await database
    .collection("comissoes_afiliados")
    .find({ afiliadoId })
    .sort({ criadoEm: -1 })
    .toArray();
  return docs.map((d) => ({ ...d, _id: d._id.toString() })) as ComissaoAfiliado[];
}

export async function createComissaoIfNew(data: Omit<ComissaoAfiliado, "_id" | "criadoEm">): Promise<void> {
  const database = await db();
  const existing = await database
    .collection("comissoes_afiliados")
    .findOne({ processoId: data.processoId });
  if (existing) return;
  await database.collection("comissoes_afiliados").insertOne({
    ...data,
    criadoEm: new Date().toISOString(),
  });
}

export async function updateComissao(id: string, data: Partial<ComissaoAfiliado>): Promise<void> {
  const database = await db();
  await database
    .collection("comissoes_afiliados")
    .updateOne({ _id: new ObjectId(id) }, { $set: data });
}

export async function getReferidosLGPD(afiliadoId: string): Promise<ReferidoLGPD[]> {
  const database = await db();

  const referidos = await database
    .collection("users")
    .find({ afiliadoRefId: afiliadoId }, { projection: { name: 1, criadoEm: 1, _id: 1 } })
    .sort({ criadoEm: -1 })
    .toArray();

  const result: ReferidoLGPD[] = [];

  for (const u of referidos) {
    const temProcessoAtivo = !!(await database.collection("processos_clube").findOne({
      userId: u._id.toString(),
      status: { $nin: ["concluido", "cancelado"] },
    }));

    const primeiroNome = ((u.name as string) ?? "").split(" ")[0] ?? "";
    const partes = ((u.name as string) ?? "").split(" ");
    const iniciais =
      partes.length >= 2
        ? `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
        : primeiroNome.slice(0, 2).toUpperCase();

    result.push({
      iniciais,
      cadastradoEm: u.criadoEm ?? "",
      temProcessoAtivo,
    });
  }

  return result;
}
