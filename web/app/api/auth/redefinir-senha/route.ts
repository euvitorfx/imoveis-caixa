import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  const { token, novaSenha } = await req.json();

  if (!token || !novaSenha || novaSenha.length < 6) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const reset = await db.collection("passwordResets").findOne({ token });
  if (!reset) {
    return NextResponse.json({ error: "Link inválido ou já utilizado." }, { status: 400 });
  }
  if (new Date() > new Date(reset.expiresAt)) {
    await db.collection("passwordResets").deleteOne({ token });
    return NextResponse.json({ error: "Link expirado. Solicite um novo." }, { status: 400 });
  }

  const senhaHash = await bcrypt.hash(novaSenha, 12);
  await db.collection("users").updateOne(
    { email: reset.email },
    { $set: { senhaHash } },
  );
  await db.collection("passwordResets").deleteOne({ token });

  return NextResponse.json({ ok: true });
}
