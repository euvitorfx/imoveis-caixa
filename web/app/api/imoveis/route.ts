import { NextRequest, NextResponse } from "next/server";
import { Sort } from "mongodb";
import clientPromise from "@/lib/mongodb";

const SORT_MAP: Record<string, Sort> = {
  "preco_asc":      { preco: 1 },
  "preco_desc":     { preco: -1 },
  "desconto_desc":  { precoAval: -1 },
  "area_desc":      { areaTotal: -1 },
  "leilao_prox":    { dataLeilao1Date: 1 },
  "recente":        { dataInsercao: -1 },
  "antigo":         { dataInsercao: 1 },
};

function parseList(val: string | null): string[] {
  if (!val) return [];
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const estadoList = parseList(searchParams.get("estado"));
  const cidadeList = parseList(searchParams.get("cidade"));
  const bairroList = parseList(searchParams.get("bairro"));
  const tipoList   = parseList(searchParams.get("tipo"));
  const modalList  = parseList(searchParams.get("modalidade"));
  const endereco   = searchParams.get("endereco") || "";
  const precoMin   = searchParams.get("precoMin");
  const precoMax   = searchParams.get("precoMax");
  const areaMin    = searchParams.get("areaMin");
  const areaMax    = searchParams.get("areaMax");
  const quartos    = searchParams.get("quartos");
  const vagas      = searchParams.get("vagas");
  const suites     = searchParams.get("suites");
  const ocupacao   = searchParams.get("ocupacao") || "";
  const fgts            = searchParams.get("fgts");
  const leilaoAgendado  = searchParams.get("leilaoAgendado");
  const financiamento   = searchParams.get("financiamento");
  const descontoMin = searchParams.get("descontoMin");
  const ordenar    = searchParams.get("ordenar") || "preco_asc";
  const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
  const limit = Math.min(30000, parseInt(searchParams.get("limit") || "24"));
  const skip  = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { ativo: true };

  if (estadoList.length === 1) filter.estado = estadoList[0].toUpperCase();
  else if (estadoList.length > 1) filter.estado = { $in: estadoList.map((s) => s.toUpperCase()) };

  if (cidadeList.length === 1) filter.cidade = { $regex: cidadeList[0], $options: "i" };
  else if (cidadeList.length > 1) filter.cidade = { $in: cidadeList };

  if (bairroList.length === 1) filter.bairro = { $regex: bairroList[0], $options: "i" };
  else if (bairroList.length > 1) filter.bairro = { $in: bairroList };

  if (endereco) filter.endereco = { $regex: endereco, $options: "i" };

  if (tipoList.length === 1) filter.tipo = { $regex: tipoList[0], $options: "i" };
  else if (tipoList.length > 1) filter.tipo = { $in: tipoList };

  if (modalList.length === 1) filter.modalidade = { $regex: modalList[0], $options: "i" };
  else if (modalList.length > 1) filter.modalidade = { $in: modalList };
  if (financiamento === "sim") filter.financiamento = { $regex: "sim", $options: "i" };
  if (quartos)    filter.quartos = { $gte: parseInt(quartos) };
  if (vagas)      filter.vagas   = { $gte: parseInt(vagas) };
  if (suites)     filter.suites  = { $gte: parseInt(suites) };
  if (ocupacao)   filter.ocupacao = { $regex: ocupacao, $options: "i" };
  if (fgts === "sim") filter.fgts = true;
  if (leilaoAgendado === "sim") {
    filter.dataLeilao1Date = { $gte: new Date() };
  }

  if (areaMin || areaMax) {
    filter.areaTotal = {};
    if (areaMin) filter.areaTotal.$gte = parseFloat(areaMin);
    if (areaMax) filter.areaTotal.$lte = parseFloat(areaMax);
  }

  if (descontoMin) {
    const pct = parseInt(descontoMin) / 100;
    filter.$expr = { $gte: [{ $subtract: [1, { $divide: ["$preco", "$precoAval"] }] }, pct] };
  }

  if (precoMin || precoMax) {
    filter.preco = {};
    if (precoMin) filter.preco.$gte = parseFloat(precoMin);
    if (precoMax) filter.preco.$lte = parseFloat(precoMax);
  }

  const sort = SORT_MAP[ordenar] ?? SORT_MAP["preco_asc"];

  try {
    const client = await clientPromise;
    const db     = client.db(process.env.MONGODB_DB);
    const col    = db.collection(process.env.MONGODB_COLLECTION!);

    const [docs, total] = await Promise.all([
      col
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .project({
          _id: 1, hdnImovel: 1, estado: 1, cidade: 1, bairro: 1,
          endereco: 1, preco: 1, precoAval: 1, desconto: 1,
          modalidade: 1, financiamento: 1, tipo: 1,
          areaTotal: 1, areaUtil: 1, quartos: 1, vagas: 1,
          fotoUrl: 1, urlDetalhe: 1, lat: 1, lng: 1,
        })
        .toArray(),
      col.countDocuments(filter),
    ]);

    return NextResponse.json({
      imoveis: docs.map((d) => ({ ...d, _id: d._id.toString() })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
