import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const R2_BASE = process.env.R2_PUBLIC_URL ?? "https://pub-55673c9129354bcdad5bb571c2237b66.r2.dev";

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ imoveis: [], removidos: [] });

  const hdnList = ids.split(",").filter(Boolean);
  if (hdnList.length === 0) return NextResponse.json({ imoveis: [], removidos: [] });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const col = db.collection(process.env.MONGODB_COLLECTION!);
  const mudancasCol = db.collection("mudancas_imoveis");

  const [docs, mudancasRaw] = await Promise.all([
    col
      .find({ hdnImovel: { $in: hdnList } })
      .project({
        _id: 1, hdnImovel: 1, estado: 1, cidade: 1, bairro: 1,
        endereco: 1, preco: 1, precoAval: 1, desconto: 1,
        modalidade: 1, financiamento: 1, tipo: 1,
        areaTotal: 1, areaUtil: 1, quartos: 1, vagas: 1, suites: 1,
        fotoUrl: 1, fotoMigrada: 1, urlDetalhe: 1, dataLeilao1: 1,
        fgts: 1, ocupacao: 1, descricao: 1, ativo: 1,
      })
      .toArray(),
    mudancasCol
      .find(
        { hdnImovel: { $in: hdnList }, notificado: { $ne: true } },
        { projection: { hdnImovel: 1, campo: 1, de: 1, para: 1 } }
      )
      .toArray(),
  ]);

  // Agrupa mudanças por hdnImovel
  const mudancasPorHdn: Record<string, { campo: string; de: unknown; para: unknown }[]> = {};
  for (const m of mudancasRaw) {
    const hdn = m.hdnImovel as string;
    (mudancasPorHdn[hdn] ??= []).push({ campo: m.campo as string, de: m.de, para: m.para });
  }

  const imoveis: unknown[] = [];
  const removidos: unknown[] = [];

  for (const doc of docs) {
    const hdn = doc.hdnImovel as string;
    const fotoUrl = doc.fotoMigrada
      ? `${R2_BASE}/imoveis-caixa/${hdn}`
      : (doc.fotoUrl as string | undefined);

    const item = {
      ...doc,
      _id: doc._id.toString(),
      fotoUrl,
      mudancas: mudancasPorHdn[hdn] ?? [],
    };

    if (doc.ativo === false) removidos.push(item);
    else imoveis.push(item);
  }

  return NextResponse.json({ imoveis, removidos });
}
