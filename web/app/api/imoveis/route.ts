import { NextRequest, NextResponse } from "next/server";
import { Sort } from "mongodb";
import clientPromise from "@/lib/mongodb";

const SORT_MAP: Record<string, Sort> = {
  "preco_asc":      { preco: 1 },
  "preco_desc":     { preco: -1 },
  "desconto_desc":  { precoAval: -1 },
  "area_desc":      { areaTotal: -1 },
  "recente":        { dataInsercao: -1 },
  "antigo":         { dataInsercao: 1 },
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const estado     = searchParams.get("estado") || "";
  const cidade     = searchParams.get("cidade") || "";
  const bairro     = searchParams.get("bairro") || "";
  const tipo       = searchParams.get("tipo") || "";
  const modalidade = searchParams.get("modalidade") || "";
  const precoMin   = searchParams.get("precoMin");
  const precoMax   = searchParams.get("precoMax");
  const areaMin    = searchParams.get("areaMin");
  const areaMax    = searchParams.get("areaMax");
  const quartos    = searchParams.get("quartos");
  const vagas      = searchParams.get("vagas");
  const suites     = searchParams.get("suites");
  const ocupacao   = searchParams.get("ocupacao") || "";
  const fgts       = searchParams.get("fgts");
  const financiamento = searchParams.get("financiamento");
  const descontoMin = searchParams.get("descontoMin");
  const ordenar    = searchParams.get("ordenar") || "preco_asc";
  const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
  const limit = Math.min(48, parseInt(searchParams.get("limit") || "24"));
  const skip  = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { ativo: true };

  if (estado)     filter.estado     = estado.toUpperCase();
  if (cidade)     filter.cidade     = { $regex: cidade, $options: "i" };
  if (bairro)     filter.bairro     = { $regex: bairro, $options: "i" };
  if (tipo)       filter.tipo       = { $regex: tipo,   $options: "i" };
  if (modalidade) filter.modalidade = { $regex: modalidade, $options: "i" };
  if (financiamento === "sim") filter.financiamento = { $regex: "sim", $options: "i" };
  if (quartos)    filter.quartos = { $gte: parseInt(quartos) };
  if (vagas)      filter.vagas   = { $gte: parseInt(vagas) };
  if (suites)     filter.suites  = { $gte: parseInt(suites) };
  if (ocupacao)   filter.ocupacao = { $regex: ocupacao, $options: "i" };
  if (fgts === "sim") filter.fgts = true;

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
