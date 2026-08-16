import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { validateUnsubToken } from "@/lib/unsubscribeToken";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const userId = token ? validateUnsubToken(token) : null;

  if (!userId) {
    return NextResponse.redirect(new URL("/alertas/descadastro?erro=token-invalido", req.url));
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { "preferencias.alertas": false } }
    );
  } catch {
    return NextResponse.redirect(new URL("/alertas/descadastro?erro=servidor", req.url));
  }

  return NextResponse.redirect(new URL("/alertas/descadastro?ok=1", req.url));
}
