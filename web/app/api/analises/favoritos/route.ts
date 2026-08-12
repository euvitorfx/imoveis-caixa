import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(session.user.id) }, { projection: { favoritos: 1 } });

  const ids: string[] = user?.favoritos ?? [];
  if (!ids.length) return NextResponse.json([]);

  const imoveis = await db
    .collection(process.env.MONGODB_COLLECTION!)
    .find({ hdnImovel: { $in: ids } })
    .project({
      _id: 0,
      hdnImovel: 1,
      endereco: 1,
      cidade: 1,
      estado: 1,
      tipo: 1,
      preco: 1,
      precoAval: 1,
      fotoUrl: 1,
    })
    .toArray();

  return NextResponse.json(imoveis);
}
