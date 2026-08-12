import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const client = await clientPromise;
  const col = client.db(process.env.MONGODB_DB).collection("users");

  const [total, premium, comTelefone, recentes] = await Promise.all([
    col.countDocuments({}),
    col.countDocuments({ plano: "premium" }),
    col.countDocuments({ telefone: { $nin: [null, ""] } }),
    col.find({})
      .sort({ criadoEm: -1 })
      .limit(200)
      .project({ _id: 1, name: 1, email: 1, telefone: 1, plano: 1, criadoEm: 1 })
      .toArray(),
  ]);

  return NextResponse.json({
    total,
    premium,
    comTelefone,
    gratuito: total - premium,
    recentes: recentes.map((u) => ({ ...u, _id: u._id.toString() })),
  });
}
