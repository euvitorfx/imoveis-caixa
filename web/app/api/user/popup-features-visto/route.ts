import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const client = await clientPromise;
  await client
    .db(process.env.MONGODB_DB)
    .collection("users")
    .updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: { popupFeaturesVisto: true } }
    );

  return NextResponse.json({ ok: true });
}
