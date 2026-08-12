import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth, signOut } from "@/auth";
import clientPromise from "@/lib/mongodb";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = session.user.id;
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  // Remove o usuário, as contas OAuth vinculadas e sessões persistidas
  await Promise.all([
    db.collection("users").deleteOne({ _id: new ObjectId(userId) }),
    db.collection("accounts").deleteMany({ userId: new ObjectId(userId) }),
    db.collection("sessions").deleteMany({ userId: new ObjectId(userId) }),
  ]);

  // Desloga (não redireciona — o cliente faz o redirect)
  await signOut({ redirect: false });

  return NextResponse.json({ ok: true });
}
