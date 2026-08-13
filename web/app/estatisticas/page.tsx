import { Metadata } from "next";
import clientPromise from "@/lib/mongodb";
import EstatisticasUI, {
  EstadoStat, ItemStat, M2Stat, EvolucaoItem, DestaqueStat, TopCidade, FaixaPreco,
} from "@/components/EstatisticasUI";

export const revalidate = 3600;

async function getAnalytics(): Promise<{ visitas30d: number | null }> {
  const token     = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return { visitas30d: null };
  try {
    const to   = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res  = await fetch(
      `https://vercel.com/api/web-analytics/timeseries?projectId=${projectId}&environment=production&from=${from}&to=${to}&filter=%7B%7D`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return { visitas30d: null };
    const json = await res.json();
    const rows: { total: number }[] = json?.data?.groups?.all ?? [];
    return { visitas30d: rows.reduce((s, r) => s + r.total, 0) };
  } catch {
    return { visitas30d: null };
  }
}

export const metadata: Metadata = {
  title: "Estatísticas",
  description: "Panorama geral dos imóveis da Caixa disponíveis no Brasil. Dados por estado, tipo, modalidade, desconto e evolução do acervo.",
};

type FacetResult = Record<string, { n: number }[]>;

async function getStats() {
  const client = await clientPromise;
  const db  = client.db(process.env.MONGODB_DB);
  const col = db.collection(process.env.MONGODB_COLLECTION!);
  const meta = db.collection("_meta");

  const sete   = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);
  const quinze = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const trinta = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const descontoExpr = (pct: number) => ({
    ativo: true,
    $expr: { $gte: [{ $subtract: [1, { $divide: ["$preco", "$precoAval"] }] }, pct / 100] },
  });

  const [
    total, porEstado, porTipo, porModalidade,
    comDesconto10, comDesconto20, comDesconto30, comDesconto40, comDesconto50,
    aceitaFinanciamento,
    maisBaratoArr, maiorDescontoArr,
    precoPorM2PorEstado, abaixo100k,
    novos7d, removidos7d, atualizados7d,
    novos15d, removidos15d, atualizados15d,
    novos30d, removidos30d, atualizados30d,
    evolucaoAcervo,
    faixaPrecoRaw,
    topCidadesRaw,
    visitasDoc,
    valorAcervoRaw,
    saidasValor7dRaw,
    saidasValor15dRaw,
    saidasValor30dRaw,
  ] = await Promise.all([

    col.countDocuments({ ativo: true }),

    col.aggregate([
      { $match: { ativo: true } },
      { $group: {
        _id: "$estado",
        total: { $sum: 1 },
        precoMedio: { $avg: "$preco" },
        precoMin:   { $min: "$preco" },
        precoMax:   { $max: "$preco" },
        descontoMedio: {
          $avg: {
            $cond: [
              { $and: [{ $gt: ["$preco", 0] }, { $gt: ["$precoAval", 0] }] },
              { $multiply: [{ $subtract: [1, { $divide: ["$preco", "$precoAval"] }] }, 100] },
              null,
            ],
          },
        },
      }},
      { $sort: { total: -1 } },
    ]).toArray() as Promise<EstadoStat[]>,

    col.aggregate([
      { $match: { ativo: true, tipo: { $exists: true, $ne: null } } },
      { $group: { _id: "$tipo", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]).toArray() as Promise<ItemStat[]>,

    col.aggregate([
      { $match: { ativo: true, modalidade: { $exists: true, $ne: null } } },
      { $group: { _id: "$modalidade", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]).toArray() as Promise<ItemStat[]>,

    col.countDocuments(descontoExpr(10)),
    col.countDocuments(descontoExpr(20)),
    col.countDocuments(descontoExpr(30)),
    col.countDocuments(descontoExpr(40)),
    col.countDocuments(descontoExpr(50)),

    col.countDocuments({ ativo: true, financiamento: { $regex: "sim", $options: "i" } }),

    col.find(
      { ativo: true, preco: { $gt: 0, $ne: null } },
      { sort: { preco: 1 }, projection: { _id: 0, hdnImovel: 1, preco: 1, cidade: 1, estado: 1, tipo: 1 } }
    ).limit(1).toArray() as unknown as Promise<DestaqueStat[]>,

    col.aggregate([
      { $match: { ativo: true, preco: { $gt: 0 }, precoAval: { $gt: 0 } } },
      { $addFields: { pctDesconto: { $multiply: [{ $subtract: [1, { $divide: ["$preco", "$precoAval"] }] }, 100] } } },
      { $match: { pctDesconto: { $gt: 0 } } },
      { $sort: { pctDesconto: -1 } },
      { $limit: 1 },
      { $project: { _id: 0, hdnImovel: 1, preco: 1, precoAval: 1, pctDesconto: 1, cidade: 1, estado: 1, tipo: 1 } },
    ]).toArray() as Promise<DestaqueStat[]>,

    col.aggregate([
      { $match: { ativo: true, areaTotal: { $gte: 15 }, preco: { $gt: 0 } } },
      { $addFields: { precoPorM2: { $divide: ["$preco", "$areaTotal"] } } },
      { $match: { precoPorM2: { $gte: 100, $lte: 50000 } } },
      { $group: { _id: "$estado", precoPorM2Medio: { $avg: "$precoPorM2" }, total: { $sum: 1 } } },
      { $sort: { precoPorM2Medio: 1 } },
    ]).toArray() as Promise<M2Stat[]>,

    col.countDocuments({ ativo: true, preco: { $gt: 0, $lt: 100000 } }),

    // Movimentações 7 dias
    col.countDocuments({ dataInsercao: { $gte: sete } }),
    col.countDocuments({ ativo: false, dataAtualizacao: { $gte: sete } }),
    col.countDocuments({ ativo: true, dataAtualizacao: { $gte: sete }, dataInsercao: { $lt: sete } }),
    // Movimentações 15 dias
    col.countDocuments({ dataInsercao: { $gte: quinze } }),
    col.countDocuments({ ativo: false, dataAtualizacao: { $gte: quinze } }),
    col.countDocuments({ ativo: true, dataAtualizacao: { $gte: quinze }, dataInsercao: { $lt: quinze } }),
    // Movimentações 30 dias
    col.countDocuments({ dataInsercao: { $gte: trinta } }),
    col.countDocuments({ ativo: false, dataAtualizacao: { $gte: trinta } }),
    col.countDocuments({ ativo: true, dataAtualizacao: { $gte: trinta }, dataInsercao: { $lt: trinta } }),

    col.aggregate([
      { $match: { dataInsercao: { $exists: true, $ne: null } } },
      { $group: {
        _id: { ano: { $year: "$dataInsercao" }, mes: { $month: "$dataInsercao" } },
        total: { $sum: 1 },
      }},
      { $sort: { "_id.ano": 1, "_id.mes": 1 } },
      { $limit: 24 },
    ]).toArray() as Promise<EvolucaoItem[]>,

    col.aggregate([
      { $match: { ativo: true, preco: { $gt: 0 } } },
      { $facet: {
        abaixo100k: [{ $match: { preco: { $lt: 100000 } } },              { $count: "n" }],
        de100k300k: [{ $match: { preco: { $gte: 100000, $lt: 300000 } } }, { $count: "n" }],
        de300k500k: [{ $match: { preco: { $gte: 300000, $lt: 500000 } } }, { $count: "n" }],
        de500k1M:   [{ $match: { preco: { $gte: 500000, $lt: 1000000 } } },{ $count: "n" }],
        acima1M:    [{ $match: { preco: { $gte: 1000000 } } },             { $count: "n" }],
      }},
    ]).toArray() as Promise<FacetResult[]>,

    col.aggregate([
      { $match: { ativo: true, cidade: { $exists: true, $ne: null } } },
      { $group: { _id: { cidade: "$cidade", estado: "$estado" }, total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]).toArray() as Promise<TopCidade[]>,

    meta.findOne({ key: "visitas" }),

    // Valor total do acervo ativo
    col.aggregate([
      { $match: { ativo: true, preco: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$preco" } } },
    ]).toArray(),

    // Valor de saídas do acervo por período
    col.aggregate([
      { $match: { ativo: false, preco: { $gt: 0 }, dataAtualizacao: { $gte: sete } } },
      { $group: { _id: null, total: { $sum: "$preco" }, count: { $sum: 1 } } },
    ]).toArray(),
    col.aggregate([
      { $match: { ativo: false, preco: { $gt: 0 }, dataAtualizacao: { $gte: quinze } } },
      { $group: { _id: null, total: { $sum: "$preco" }, count: { $sum: 1 } } },
    ]).toArray(),
    col.aggregate([
      { $match: { ativo: false, preco: { $gt: 0 }, dataAtualizacao: { $gte: trinta } } },
      { $group: { _id: null, total: { $sum: "$preco" }, count: { $sum: 1 } } },
    ]).toArray(),
  ]);

  const fp = faixaPrecoRaw[0] as FacetResult | undefined;
  const faixaPreco: FaixaPreco = {
    abaixo100k: fp?.abaixo100k?.[0]?.n ?? 0,
    de100k300k: fp?.de100k300k?.[0]?.n ?? 0,
    de300k500k: fp?.de300k500k?.[0]?.n ?? 0,
    de500k1M:   fp?.de500k1M?.[0]?.n   ?? 0,
    acima1M:    fp?.acima1M?.[0]?.n     ?? 0,
  };

  const maisBarato    = maisBaratoArr[0]    ?? null;
  const maiorDesconto = maiorDescontoArr[0] ?? null;
  const topCidades    = topCidadesRaw as TopCidade[];
  const pageviewsTotal: number = (visitasDoc as Record<string, number> | null)?.pageviews ?? 0;

  type ValorRow = { _id: null; total: number; count?: number };
  const valorTotalAcervo = (valorAcervoRaw as ValorRow[])[0]?.total ?? 0;

  const sv7  = (saidasValor7dRaw  as ValorRow[])[0];
  const sv15 = (saidasValor15dRaw as ValorRow[])[0];
  const sv30 = (saidasValor30dRaw as ValorRow[])[0];

  const saidasValor = {
    v7d:  { valor: sv7?.total  ?? 0, count: sv7?.count  ?? 0 },
    v15d: { valor: sv15?.total ?? 0, count: sv15?.count ?? 0 },
    v30d: { valor: sv30?.total ?? 0, count: sv30?.count ?? 0 },
  };

  return {
    total, porEstado, porTipo, porModalidade,
    comDesconto10, comDesconto20, comDesconto30, comDesconto40, comDesconto50,
    aceitaFinanciamento,
    maisBarato, maiorDesconto,
    precoPorM2PorEstado,
    abaixo100k,
    novos7d, removidos7d, atualizados7d,
    novos15d, removidos15d, atualizados15d,
    novos30d, removidos30d, atualizados30d,
    evolucaoAcervo,
    faixaPreco, topCidades,
    pageviewsTotal,
    valorTotalAcervo,
    saidasValor,
  };
}

export default async function EstatisticasPage() {
  const [s, analytics] = await Promise.all([getStats(), getAnalytics()]);

  return (
    <EstatisticasUI
      {...s}
      visitas30d={analytics.visitas30d}
    />
  );
}
