import { NextRequest, NextResponse } from "next/server";
import { ObjectId, Document } from "mongodb";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";

const LIMITE_GRATUITO = 10;

async function getUser(id: string) {
  const client = await clientPromise;
  return client
    .db(process.env.MONGODB_DB)
    .collection("users")
    .findOne({ _id: new ObjectId(id) }, { projection: { favoritos: 1, plano: 1 } });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await getUser(session.user.id);
  return NextResponse.json({ favoritos: user?.favoritos ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { hdnImovel } = await req.json();
  if (!hdnImovel) return NextResponse.json({ error: "hdnImovel obrigatório" }, { status: 400 });

  const user = await getUser(session.user.id);
  const atual: string[] = user?.favoritos ?? [];

  if (atual.includes(hdnImovel)) return NextResponse.json({ favoritos: atual });

  const plano = user?.plano ?? session.user.plano ?? "gratuito";
  if (plano === "gratuito" && atual.length >= LIMITE_GRATUITO) {
    return NextResponse.json(
      { error: `Limite de ${LIMITE_GRATUITO} favoritos atingido no plano gratuito.` },
      { status: 403 }
    );
  }

  const client = await clientPromise;
  await client
    .db(process.env.MONGODB_DB)
    .collection("users")
    .updateOne({ _id: new ObjectId(session.user.id) }, { $addToSet: { favoritos: hdnImovel } });

  return NextResponse.json({ favoritos: [...atual, hdnImovel] });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const hdnImovel = req.nextUrl.searchParams.get("id");
  if (!hdnImovel) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const client = await clientPromise;
  await client
    .db(process.env.MONGODB_DB)
    .collection("users")
    .updateOne({ _id: new ObjectId(session.user.id) }, { $pull: { favoritos: hdnImovel } } as Document);

  return NextResponse.json({ ok: true });
}
