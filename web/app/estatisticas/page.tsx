import { Metadata } from "next";
import clientPromise from "@/lib/mongodb";

export const revalidate = 3600;

async function getAnalytics(): Promise<{ pageviews: number | null; visitors: number | null }> {
  const token     = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return { pageviews: null, visitors: null };
  try {
    const to   = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res  = await fetch(
      `https://vercel.com/api/web-analytics/timeseries?projectId=${projectId}&environment=production&from=${from}&to=${to}&filter=%7B%7D`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return { pageviews: null, visitors: null };
    const json = await res.json();
    const rows: { total: number; devices: number }[] = json?.data?.groups?.all ?? [];
    return {
      pageviews: rows.reduce((s, r) => s + r.total, 0),
      visitors:  rows.reduce((s, r) => s + r.devices, 0),
    };
  } catch {
    return { pageviews: null, visitors: null };
  }
}

export const metadata: Metadata = {
  title: "Estatísticas",
  description: "Panorama geral dos imóveis da Caixa disponíveis no Brasil. Dados por estado, tipo, modalidade, desconto e evolução do acervo.",
};

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtN(n: number) { return n.toLocaleString("pt-BR"); }
function fmtM2(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) + "/m²";
}

interface EstadoStat  { _id: string; total: number; precoMedio: number | null; precoMin: number | null; precoMax: number | null; }
interface ItemStat    { _id: string; total: number; }
interface M2Stat      { _id: string; precoPorM2Medio: number; total: number; }
interface EvolucaoItem { _id: { ano: number; mes: number }; total: number; }
interface DestaqueStat { hdnImovel: string; preco: number; cidade: string; estado: string; tipo?: string; pctDesconto?: number; precoAval?: number; }

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

async function getStats() {
  const client = await clientPromise;
  const col = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);

  const [
    total, porEstado, porTipo, porModalidade,
    comDesconto30, aceitaFinanciamento,
    maisBaratoArr, maiorDescontoArr,
    precoPorM2PorEstado,
    comDesconto50, abaixo100k, novos24h,
    evolucaoAcervo,
  ] = await Promise.all([

    col.countDocuments({ ativo: true }),

    col.aggregate([
      { $match: { ativo: true } },
      { $group: { _id: "$estado", total: { $sum: 1 }, precoMedio: { $avg: "$preco" }, precoMin: { $min: "$preco" }, precoMax: { $max: "$preco" } } },
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

    col.countDocuments({
      ativo: true,
      $expr: { $gte: [{ $subtract: [1, { $divide: ["$preco", "$precoAval"] }] }, 0.3] },
    }),

    col.countDocuments({ ativo: true, financiamento: { $regex: "sim", $options: "i" } }),

    // Imóvel mais barato
    col.find(
      { ativo: true, preco: { $gt: 0, $ne: null } },
      { sort: { preco: 1 }, projection: { hdnImovel: 1, preco: 1, cidade: 1, estado: 1, tipo: 1 } }
    ).limit(1).toArray() as unknown as Promise<DestaqueStat[]>,

    // Maior desconto
    col.aggregate([
      { $match: { ativo: true, preco: { $gt: 0 }, precoAval: { $gt: 0 } } },
      { $addFields: { pctDesconto: { $multiply: [{ $subtract: [1, { $divide: ["$preco", "$precoAval"] }] }, 100] } } },
      { $match: { pctDesconto: { $gt: 0 } } },
      { $sort: { pctDesconto: -1 } },
      { $limit: 1 },
      { $project: { hdnImovel: 1, preco: 1, precoAval: 1, pctDesconto: 1, cidade: 1, estado: 1, tipo: 1 } },
    ]).toArray() as Promise<DestaqueStat[]>,

    // Preço médio m² por estado — filtra áreas < 15m² (dados inválidos) e outliers de preço/m²
    col.aggregate([
      { $match: { ativo: true, areaTotal: { $gte: 15 }, preco: { $gt: 0 } } },
      { $addFields: { precoPorM2: { $divide: ["$preco", "$areaTotal"] } } },
      { $match: { precoPorM2: { $gte: 100, $lte: 50000 } } },
      { $group: { _id: "$estado", precoPorM2Medio: { $avg: "$precoPorM2" }, total: { $sum: 1 } } },
      { $sort: { precoPorM2Medio: 1 } },
    ]).toArray() as Promise<M2Stat[]>,

    // Desconto > 50%
    col.countDocuments({
      ativo: true,
      $expr: { $gte: [{ $subtract: [1, { $divide: ["$preco", "$precoAval"] }] }, 0.5] },
    }),

    // Abaixo de R$ 100k
    col.countDocuments({ ativo: true, preco: { $gt: 0, $lt: 100000 } }),

    // Novos nas últimas 24h
    col.countDocuments({ dataInsercao: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),

    // Evolução do acervo por mês
    col.aggregate([
      { $match: { dataInsercao: { $exists: true, $ne: null } } },
      { $group: {
        _id: { ano: { $year: "$dataInsercao" }, mes: { $month: "$dataInsercao" } },
        total: { $sum: 1 },
      }},
      { $sort: { "_id.ano": 1, "_id.mes": 1 } },
      { $limit: 24 },
    ]).toArray() as Promise<EvolucaoItem[]>,

  ]);

  const maisBarato    = maisBaratoArr[0]    ?? null;
  const maiorDesconto = maiorDescontoArr[0] ?? null;

  return {
    total, porEstado, porTipo, porModalidade,
    comDesconto30, aceitaFinanciamento,
    maisBarato, maiorDesconto,
    precoPorM2PorEstado,
    comDesconto50, abaixo100k, novos24h,
    evolucaoAcervo,
  };
}

export default async function EstatisticasPage() {
  const [s, analytics] = await Promise.all([getStats(), getAnalytics()]);
  const maxEstado = Math.max(...s.porEstado.map((e) => e.total));
  const maxM2 = Math.max(...s.precoPorM2PorEstado.map((e) => e.precoPorM2Medio));
  const maxEvolucao = Math.max(...s.evolucaoAcervo.map((e) => e.total), 1);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Estatísticas</h1>
        <p className="text-gray-500 text-sm mt-1">Panorama geral dos imóveis Caixa disponíveis no Brasil. Atualizado a cada hora.</p>
      </div>

      {/* Destaques — mais barato e maior desconto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {s.maisBarato && (
          <a href={`/imovel/${s.maisBarato.hdnImovel}`}
            className="bg-white rounded-xl shadow hover:shadow-md transition-shadow p-5 flex flex-col gap-1 border-l-4 border-green-500">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Imóvel mais barato</p>
            <p className="text-2xl font-bold text-gray-800">{fmt(s.maisBarato.preco)}</p>
            <p className="text-sm text-gray-500 truncate">
              {s.maisBarato.tipo || "Imóvel"} · {s.maisBarato.cidade}/{s.maisBarato.estado}
            </p>
            <p className="text-xs text-green-600 mt-1">Ver imóvel →</p>
          </a>
        )}
        {s.maiorDesconto && (
          <a href={`/imovel/${s.maiorDesconto.hdnImovel}`}
            className="bg-white rounded-xl shadow hover:shadow-md transition-shadow p-5 flex flex-col gap-1 border-l-4 border-orange-500">
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Maior desconto ativo</p>
            <p className="text-2xl font-bold text-gray-800">
              -{Math.round(s.maiorDesconto.pctDesconto ?? 0)}%
            </p>
            <p className="text-sm text-gray-500 truncate">
              {fmt(s.maiorDesconto.preco)} · {s.maiorDesconto.cidade}/{s.maiorDesconto.estado}
            </p>
            <p className="text-xs text-orange-600 mt-1">Ver imóvel →</p>
          </a>
        )}
      </div>

      {/* Cards resumo — linha 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-brand-900">{fmtN(s.total)}</p>
          <p className="text-xs text-gray-500 mt-1">Imóveis ativos</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{fmtN(s.aceitaFinanciamento)}</p>
          <p className="text-xs text-gray-500 mt-1">Aceitam financiamento</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-orange-500">{fmtN(s.comDesconto30)}</p>
          <p className="text-xs text-gray-500 mt-1">Desconto &gt; 30%</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{fmtN(s.comDesconto50)}</p>
          <p className="text-xs text-gray-500 mt-1">Desconto &gt; 50%</p>
        </div>
      </div>

      {/* Cards resumo — linha 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{fmtN(s.abaixo100k)}</p>
          <p className="text-xs text-gray-500 mt-1">Abaixo de R$ 100k</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{fmtN(s.novos24h)}</p>
          <p className="text-xs text-gray-500 mt-1">Novos nas últimas 24h</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{s.porEstado.length}</p>
          <p className="text-xs text-gray-500 mt-1">Estados cobertos</p>
        </div>
      </div>

      {/* Pageviews Vercel Analytics */}
      {(analytics.pageviews !== null || analytics.visitors !== null) && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-3xl font-bold text-indigo-600">
              {analytics.pageviews !== null ? fmtN(analytics.pageviews) : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Pageviews (últimos 30 dias)</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-3xl font-bold text-indigo-400">
              {analytics.visitors !== null ? fmtN(analytics.visitors) : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Visitantes únicos (últimos 30 dias)</p>
          </div>
        </div>
      )}

      {/* Evolução do acervo */}
      {s.evolucaoAcervo.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <h2 className="font-semibold text-gray-700 mb-1">Evolução do acervo</h2>
          <p className="text-xs text-gray-400 mb-4">Imóveis adicionados por mês desde o início da coleta.</p>
          <div className="flex items-end gap-1.5 h-32">
            {s.evolucaoAcervo.map((item) => {
              const pct = Math.round((item.total / maxEvolucao) * 100);
              const label = `${MESES[item._id.mes - 1]}/${String(item._id.ano).slice(2)}`;
              return (
                <div key={`${item._id.ano}-${item._id.mes}`}
                  className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <span className="text-xs text-gray-500 font-medium">{fmtN(item.total)}</span>
                  <div className="w-full bg-brand-900 rounded-t transition-all"
                    style={{ height: `${Math.max(pct, 4)}%`, minHeight: "4px" }} />
                  <span className="text-xs text-gray-400 truncate w-full text-center">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Por Tipo */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Por tipo de imóvel</h2>
          <div className="space-y-2">
            {s.porTipo.map((t) => (
              <div key={t._id} className="flex items-center gap-2 text-sm">
                <span className="w-40 truncate text-gray-600">{t._id || "—"}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-brand-900 h-2 rounded-full"
                    style={{ width: `${Math.round((t.total / s.total) * 100)}%` }} />
                </div>
                <span className="w-12 text-right font-medium text-gray-700">{fmtN(t.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Por Modalidade */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Por modalidade de venda</h2>
          <div className="space-y-2">
            {s.porModalidade.map((m) => (
              <div key={m._id} className="flex items-center gap-2 text-sm">
                <span className="w-40 truncate text-gray-600">{m._id || "—"}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.round((m.total / s.total) * 100)}%` }} />
                </div>
                <span className="w-12 text-right font-medium text-gray-700">{fmtN(m.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preço médio m² por estado */}
      {s.precoPorM2PorEstado.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <h2 className="font-semibold text-gray-700 mb-1">Preço médio por m² por estado</h2>
          <p className="text-xs text-gray-400 mb-4">Imóveis com área ≥ 15 m² e preço/m² entre R$ 100 e R$ 50.000. A quantidade pode diferir do total por estado.</p>
          <div className="space-y-2">
            {s.precoPorM2PorEstado.map((e) => (
              <div key={e._id} className="flex items-center gap-2 text-sm">
                <a href={`/imoveis/${e._id.toLowerCase()}`}
                  className="w-8 font-semibold text-brand-900 hover:underline shrink-0">
                  {e._id}
                </a>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-400 h-2 rounded-full"
                    style={{ width: `${Math.round((e.precoPorM2Medio / maxM2) * 100)}%` }} />
                </div>
                <span className="w-28 text-right font-medium text-gray-700 shrink-0">
                  {fmtM2(e.precoPorM2Medio)}
                </span>
                <span className="text-xs text-gray-400 w-16 text-right shrink-0">
                  {fmtN(e.total)} imóv.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Por Estado */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-semibold text-gray-700 mb-4">Quantidade e preços por estado</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b">
                <th className="pb-2 font-medium">Estado</th>
                <th className="pb-2 font-medium text-right">Qtd</th>
                <th className="pb-2 font-medium text-right">Preço médio</th>
                <th className="pb-2 font-medium text-right">Mín</th>
                <th className="pb-2 font-medium text-right">Máx</th>
                <th className="pb-2 pl-4"></th>
              </tr>
            </thead>
            <tbody>
              {s.porEstado.map((e) => (
                <tr key={e._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 font-semibold text-brand-900">
                    <a href={`/imoveis/${e._id.toLowerCase()}`} className="hover:underline">{e._id}</a>
                  </td>
                  <td className="py-2 text-right">{fmtN(e.total)}</td>
                  <td className="py-2 text-right">{fmt(e.precoMedio)}</td>
                  <td className="py-2 text-right text-green-600">{fmt(e.precoMin)}</td>
                  <td className="py-2 text-right text-gray-500">{fmt(e.precoMax)}</td>
                  <td className="py-2 pl-4 w-32">
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-brand-900 h-2 rounded-full"
                        style={{ width: `${Math.round((e.total / maxEstado) * 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
