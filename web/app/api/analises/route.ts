import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";

const LIMITE_GRATUITO = 1;

function col() {
  return clientPromise.then((c) =>
    c.db(process.env.MONGODB_DB).collection("analises_viabilidade")
  );
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const c = await col();

  if (url.searchParams.get("count") === "1") {
    const total = await c.countDocuments({ userId: session.user.id });
    return NextResponse.json({ total });
  }

  const docs = await c
    .find({ userId: session.user.id })
    .sort({ atualizadaEm: -1 })
    .project({ dados: 0 })
    .toArray();

  return NextResponse.json(docs.map((d) => ({ ...d, _id: d._id.toString() })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const plano = session.user.plano ?? "gratuito";
  if (plano === "gratuito") {
    const c = await col();
    const total = await c.countDocuments({ userId: session.user.id });
    if (total >= LIMITE_GRATUITO) {
      return NextResponse.json(
        { error: `Limite de ${LIMITE_GRATUITO} análises atingido no plano gratuito. Faça upgrade para Premium.` },
        { status: 403 }
      );
    }
  }

  const body = await req.json();
  const agora = new Date();
  const c = await col();
  const result = await c.insertOne({
    userId: session.user.id,
    nome: body.nome || "Análise sem nome",
    imovelRef: body.imovelRef ?? null,
    dados: body.dados,
    criadaEm: agora,
    atualizadaEm: agora,
  });

  return NextResponse.json({ _id: result.insertedId.toString() }, { status: 201 });
}
