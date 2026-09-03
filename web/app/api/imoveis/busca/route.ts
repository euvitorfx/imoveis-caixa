import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Sort } from "mongodb";

export const revalidate = 300;

const LIMIT = 24;

const PROJECT = {
  _id: 1, hdnImovel: 1, estado: 1, cidade: 1, bairro: 1,
  endereco: 1, preco: 1, precoAval: 1, desconto: 1,
  modalidade: 1, financiamento: 1, tipo: 1,
  areaTotal: 1, areaUtil: 1, quartos: 1, vagas: 1, suites: 1,
  fotoUrl: 1, urlDetalhe: 1, dataLeilao1: 1, dataLeilao1Date: 1,
  fgts: 1, ocupacao: 1,
};

function parseList(val: string | null): string[] {
  if (!val) return [];
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { ativo: true };

  const estadoList = parseList(sp.get("estado"));
  const cidadeList = parseList(sp.get("cidade"));
  const bairroList = parseList(sp.get("bairro"));
  const tipoList   = parseList(sp.get("tipo"));
  const modalList  = parseList(sp.get("modalidade"));

  if (estadoList.length === 1) filter.estado = estadoList[0].toUpperCase();
  else if (estadoList.length > 1) filter.estado = { $in: estadoList.map((s) => s.toUpperCase()) };

  if (cidadeList.length === 1) filter.cidade = { $regex: cidadeList[0], $options: "i" };
  else if (cidadeList.length > 1) filter.cidade = { $in: cidadeList };

  if (bairroList.length === 1) filter.bairro = { $regex: bairroList[0], $options: "i" };
  else if (bairroList.length > 1) filter.bairro = { $in: bairroList };

  const endereco = sp.get("endereco");
  if (endereco) filter.endereco = { $regex: endereco, $options: "i" };

  if (tipoList.length === 1) filter.tipo = { $regex: tipoList[0], $options: "i" };
  else if (tipoList.length > 1) filter.tipo = { $in: tipoList };

  if (modalList.length === 1) filter.modalidade = { $regex: modalList[0], $options: "i" };
  else if (modalList.length > 1) filter.modalidade = { $in: modalList };

  if (sp.get("financiamento") === "sim") filter.financiamento = { $regex: "sim", $options: "i" };

  const quartos = sp.get("quartos");
  if (quartos) filter.quartos = { $gte: parseInt(quartos) };
  const vagas = sp.get("vagas");
  if (vagas) filter.vagas = { $gte: parseInt(vagas) };
  const suites = sp.get("suites");
  if (suites) filter.suites = { $gte: parseInt(suites) };

  const ocupacao = sp.get("ocupacao");
  if (ocupacao) filter.ocupacao = { $regex: ocupacao, $options: "i" };

  if (sp.get("fgts") === "sim") filter.fgts = true;
  if (sp.get("leilaoAgendado") === "sim") filter.dataLeilao1Date = { $gte: new Date() };

  const descontoMin = sp.get("descontoMin");
  if (descontoMin) {
    const pct = parseInt(descontoMin) / 100;
    filter.$expr = { $gte: [{ $subtract: [1, { $divide: ["$preco", "$precoAval"] }] }, pct] };
  }

  const precoMin = sp.get("precoMin");
  const precoMax = sp.get("precoMax");
  if (precoMin || precoMax) {
    filter.preco = {};
    if (precoMin) filter.preco.$gte = parseFloat(precoMin);
    if (precoMax) filter.preco.$lte = parseFloat(precoMax);
  }

  const areaMin = sp.get("areaMin");
  const areaMax = sp.get("areaMax");
  if (areaMin || areaMax) {
    filter.areaTotal = {};
    if (areaMin) filter.areaTotal.$gte = parseFloat(areaMin);
    if (areaMax) filter.areaTotal.$lte = parseFloat(areaMax);
  }

  const SORT_MAP: Record<string, Sort> = {
    "preco_asc":     { preco: 1 },
    "preco_desc":    { preco: -1 },
    "desconto_desc": { desconto: -1 },
    "area_desc":     { areaTotal: -1 },
    "leilao_prox":   { dataLeilao1Date: 1 },
    "recente":       { dataInsercao: -1 },
    "antigo":        { dataInsercao: 1 },
  };
  const sort = SORT_MAP[sp.get("ordenar") || "preco_asc"] ?? { preco: 1 };

  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const skip = (page - 1) * LIMIT;

  try {
    const client = await clientPromise;
    const col    = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);

    const [docs, total] = await Promise.all([
      col.find(filter).sort(sort).skip(skip).limit(LIMIT).project(PROJECT).toArray(),
      col.countDocuments(filter),
    ]);

    return NextResponse.json({
      imoveis:    docs.map((d) => ({ ...d, _id: d._id.toString() })),
      total,
      page,
      totalPages: Math.ceil(total / LIMIT),
    });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
