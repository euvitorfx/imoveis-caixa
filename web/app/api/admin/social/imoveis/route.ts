import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function checkAuth(req: NextRequest): boolean {
  const token = req.cookies.get("admin_token")?.value;
  return !!token && token === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection(process.env.MONGODB_COLLECTION!);

    const docs = await col
      .find({ ativo: true, fotoUrl: { $exists: true, $nin: [null, ""] } })
      .sort({ dataInsercao: -1 })
      .limit(30)
      .project({
        _id: 1, hdnImovel: 1, estado: 1, cidade: 1, bairro: 1,
        endereco: 1, preco: 1, precoAval: 1, desconto: 1,
        modalidade: 1, financiamento: 1, tipo: 1,
        areaTotal: 1, areaUtil: 1, quartos: 1, vagas: 1, suites: 1,
        fotoUrl: 1, urlDetalhe: 1, descricao: 1, fgts: 1, ocupacao: 1,
      })
      .toArray();

    return NextResponse.json(docs.map((d) => ({ ...d, _id: d._id.toString() })));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
