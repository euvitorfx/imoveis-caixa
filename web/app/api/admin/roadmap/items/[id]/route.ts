import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await req.json();
  const { priority } = body;
  if (!priority || typeof priority !== "string") {
    return NextResponse.json({ error: "Campo priority obrigatório" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const result = await db.collection("roadmap_items").updateOne(
    { _id: new ObjectId(id) },
    { $set: { priority, updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
