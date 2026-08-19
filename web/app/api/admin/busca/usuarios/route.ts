import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const regex = { $regex: q, $options: "i" };
  const users = await db
    .collection("users")
    .find({ $or: [{ email: regex }, { name: regex }] }, { projection: { _id: 1, name: 1, email: 1 } })
    .limit(8)
    .toArray();

  return NextResponse.json(
    users.map((u) => ({ id: u._id.toString(), nome: u.name ?? "", email: u.email ?? "" }))
  );
}
