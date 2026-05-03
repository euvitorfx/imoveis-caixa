import { notFound } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import { Imovel } from "@/lib/types";
import { ObjectId } from "mongodb";

function fmt(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

async function getImovel(id: string): Promise<Imovel | null> {
  try {
    const client = await clientPromise;
    const col    = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);
    // Busca por hdnImovel (string) ou _id
    let doc = await col.findOne({ hdnImovel: id });
    if (!doc && ObjectId.isValid(id)) {
      doc = await col.findOne({ _id: new ObjectId(id) });
    }
    if (!doc) return null;
    return { ...doc, _id: doc._id.toString() } as Imovel;
  } catch {
    return null;
  }
}

export default async function DetalheImovel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const imovel = await getImovel(id);
  if (!imovel) notFound();

  const descPct = imovel.precoAval && imovel.preco
    ? Math.round((1 - imovel.preco / imovel.precoAval) * 100)
    : null;

  const info: [string, string][] = [
    ["Estado", imovel.estado],
    ["Cidade", imovel.cidade],
    ["Bairro", imovel.bairro || "—"],
    ["Endereço", imovel.endereco || "—"],
    ["Tipo", imovel.tipo || "—"],
    ["Modalidade", imovel.modalidade || "—"],
    ["Financiamento", imovel.financiamento || "—"],
    ["Área total", imovel.areaTotal ? `${imovel.areaTotal} m²` : "—"],
    ["Área privativa", imovel.areaUtil ? `${imovel.areaUtil} m²` : "—"],
    ["Área terreno", imovel.areaTerreno ? `${imovel.areaTerreno} m²` : "—"],
    ["Quartos", imovel.quartos ? String(imovel.quartos) : "—"],
    ["Vagas", imovel.vagas ? String(imovel.vagas) : "—"],
    ["N° do imóvel", imovel.hdnImovel],
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <a href="/" className="text-blue-600 hover:underline text-sm mb-4 inline-block">← Voltar à listagem</a>

      <div className="bg-white rounded-xl shadow overflow-hidden mt-2">
        {/* Foto */}
        <div className="h-72 bg-gray-200 relative overflow-hidden">
          {imovel.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imovel.fotoUrl} alt={imovel.tipo || "Imóvel"} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">🏠</div>
          )}
        </div>

        <div className="p-6">
          {/* Preço */}
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div>
              <p className="text-3xl font-bold text-brand-900">{fmt(imovel.preco)}</p>
              {imovel.precoAval && (
                <p className="text-sm text-gray-400 line-through">Avaliação: {fmt(imovel.precoAval)}</p>
              )}
            </div>
            {descPct && descPct > 0 && (
              <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-sm">
                {descPct}% de desconto
              </span>
            )}
          </div>

          {/* Tabela de informações */}
          <h2 className="font-semibold text-gray-700 mb-3">Informações do imóvel</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {info.map(([label, val]) => (
              <div key={label} className="flex justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-800 text-right max-w-[60%]">{val}</span>
              </div>
            ))}
          </div>

          {/* Link para a Caixa */}
          <div className="mt-6">
            <a
              href={imovel.urlDetalhe}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Ver no site da Caixa →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
