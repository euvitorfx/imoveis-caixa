import clientPromise from "@/lib/mongodb";

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtN(n: number) {
  return n.toLocaleString("pt-BR");
}

interface EstadoStat {
  _id: string;
  total: number;
  precoMedio: number | null;
  precoMin: number | null;
  precoMax: number | null;
}

interface ItemStat {
  _id: string;
  total: number;
}

async function getStats() {
  const client = await clientPromise;
  const col = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);

  const [total, porEstado, porTipo, porModalidade, comDesconto30, aceitaFinanciamento] =
    await Promise.all([
      col.countDocuments({ ativo: true }),

      col.aggregate([
        { $match: { ativo: true } },
        {
          $group: {
            _id: "$estado",
            total: { $sum: 1 },
            precoMedio: { $avg: "$preco" },
            precoMin: { $min: "$preco" },
            precoMax: { $max: "$preco" },
          },
        },
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
        $expr: {
          $gte: [{ $subtract: [1, { $divide: ["$preco", "$precoAval"] }] }, 0.3],
        },
      }),

      col.countDocuments({
        ativo: true,
        financiamento: { $regex: "sim", $options: "i" },
      }),
    ]);

  return { total, porEstado, porTipo, porModalidade, comDesconto30, aceitaFinanciamento };
}

export default async function EstatisticasPage() {
  const stats = await getStats();

  const maxEstado = Math.max(...stats.porEstado.map((e) => e.total));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Estatísticas</h1>
        <p className="text-gray-500 text-sm mt-1">Panorama geral dos imóveis Caixa disponíveis no Brasil.</p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-brand-900">{fmtN(stats.total)}</p>
          <p className="text-xs text-gray-500 mt-1">Imóveis ativos</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{fmtN(stats.aceitaFinanciamento)}</p>
          <p className="text-xs text-gray-500 mt-1">Aceitam financiamento</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-orange-500">{fmtN(stats.comDesconto30)}</p>
          <p className="text-xs text-gray-500 mt-1">Com desconto &gt;30%</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{stats.porEstado.length}</p>
          <p className="text-xs text-gray-500 mt-1">Estados cobertos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Por Tipo */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Por tipo de imóvel</h2>
          <div className="space-y-2">
            {stats.porTipo.map((t) => (
              <div key={t._id} className="flex items-center gap-2 text-sm">
                <span className="w-40 truncate text-gray-600">{t._id || "—"}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand-900 h-2 rounded-full"
                    style={{ width: `${Math.round((t.total / stats.total) * 100)}%` }}
                  />
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
            {stats.porModalidade.map((m) => (
              <div key={m._id} className="flex items-center gap-2 text-sm">
                <span className="w-40 truncate text-gray-600">{m._id || "—"}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.round((m.total / stats.total) * 100)}%` }}
                  />
                </div>
                <span className="w-12 text-right font-medium text-gray-700">{fmtN(m.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Por Estado */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-semibold text-gray-700 mb-4">Por estado</h2>
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
              {stats.porEstado.map((e) => (
                <tr key={e._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 font-semibold text-brand-900">
                    <a href={`/?estado=${e._id}`} className="hover:underline">{e._id}</a>
                  </td>
                  <td className="py-2 text-right">{fmtN(e.total)}</td>
                  <td className="py-2 text-right">{fmt(e.precoMedio)}</td>
                  <td className="py-2 text-right text-green-600">{fmt(e.precoMin)}</td>
                  <td className="py-2 text-right text-gray-500">{fmt(e.precoMax)}</td>
                  <td className="py-2 pl-4 w-32">
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-brand-900 h-2 rounded-full"
                        style={{ width: `${Math.round((e.total / maxEstado) * 100)}%` }}
                      />
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
