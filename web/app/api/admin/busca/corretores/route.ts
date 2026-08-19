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
  const corretores = await db
    .collection("corretores")
    .find(
      { $or: [{ creci: regex }, { nome: regex }] },
      { projection: { _id: 1, nome: 1, creci: 1, estado: 1 } }
    )
    .limit(8)
    .toArray();

  return NextResponse.json(
    corretores.map((c) => ({
      id:     c._id.toString(),
      nome:   c.nome ?? "",
      creci:  c.creci ?? "",
      estado: c.estado ?? "",
    }))
  );
}
