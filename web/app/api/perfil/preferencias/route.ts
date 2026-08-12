import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { brasil, estados, cidades } = await req.json();

  const client = await clientPromise;
  await client
    .db(process.env.MONGODB_DB)
    .collection("users")
    .updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: { preferencias: { brasil: !!brasil, estados: estados ?? [], cidades: cidades ?? [] } } }
    );

  return NextResponse.json({ ok: true });
}
