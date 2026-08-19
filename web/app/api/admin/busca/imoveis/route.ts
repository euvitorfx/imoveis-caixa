import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) return NextResponse.json([]);

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const regex = { $regex: q, $options: "i" };
  const imoveis = await db
    .collection(process.env.MONGODB_COLLECTION!)
    .find(
      { ativo: true, $or: [{ hdnImovel: regex }, { descricao: regex }, { cidade: regex }] },
      { projection: { _id: 1, hdnImovel: 1, descricao: 1, cidade: 1, estado: 1, tipo: 1 } }
    )
    .limit(8)
    .toArray();

  return NextResponse.json(
    imoveis.map((i) => ({
      id:       i._id.toString(),
      numero:   i.hdnImovel ?? "",
      descricao: i.descricao ? String(i.descricao).slice(0, 80) : "",
      cidade:   i.cidade ?? "",
      estado:   i.estado ?? "",
      tipo:     i.tipo ?? "",
    }))
  );
}
