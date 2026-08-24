import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { num, title, items } = body;

  if (!num || !title || !Array.isArray(items)) {
    return NextResponse.json({ error: "Campos obrigatórios: num, title, items" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const order = parseInt(num, 10);
  const result = await db.collection("sprints").insertOne({
    num: String(num),
    title: String(title),
    items: items.map(String),
    order,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true, id: result.insertedId.toString() });
}
