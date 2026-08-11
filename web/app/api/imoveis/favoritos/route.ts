import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ imoveis: [] });

  const hdnList = ids.split(",").filter(Boolean);
  if (hdnList.length === 0) return NextResponse.json({ imoveis: [] });

  const client = await clientPromise;
  const col = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);

  const docs = await col
    .find({ hdnImovel: { $in: hdnList }, ativo: true })
    .project({
      _id: 1, hdnImovel: 1, estado: 1, cidade: 1, bairro: 1,
      endereco: 1, preco: 1, precoAval: 1, desconto: 1,
      modalidade: 1, financiamento: 1, tipo: 1,
      areaTotal: 1, areaUtil: 1, quartos: 1, vagas: 1, suites: 1,
      fotoUrl: 1, urlDetalhe: 1, dataLeilao1: 1,
      fgts: 1, ocupacao: 1, descricao: 1,
    })
    .toArray();

  return NextResponse.json({
    imoveis: docs.map((d) => ({ ...d, _id: d._id.toString() })),
  });
}
