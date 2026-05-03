import { Metadata } from "next";
import { notFound } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import CardImovel from "@/components/CardImovel";
import Paginacao from "@/components/Paginacao";
import { Imovel } from "@/lib/types";
import { SITE_URL, SITE_NAME } from "@/lib/config";
import { slugify, ESTADO_NOMES, ALL_ESTADOS, fmtBRL } from "@/lib/utils";

const LIMIT = 24;

export async function generateStaticParams() {
  return ALL_ESTADOS.map((estado) => ({ estado: estado.toLowerCase() }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ estado: string }> }
): Promise<Metadata> {
  const { estado } = await params;
  const uf   = estado.toUpperCase();
  const nome = ESTADO_NOMES[uf];
  if (!nome) return {};

  const title = `Imóveis Caixa em ${nome} (${uf})`;
  const desc  = `Encontre imóveis da Caixa Econômica Federal em ${nome}. Leilões, vendas online e venda direta com filtros avançados. Atualizado diariamente.`;

  return {
    title,
    description: desc,
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description: desc,
      url: `${SITE_URL}/imoveis/${estado}`,
    },
    alternates: { canonical: `${SITE_URL}/imoveis/${estado}` },
  };
}

async function getData(uf: string, page: number) {
  const client = await clientPromise;
  const col    = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);
  const filter = { ativo: true, estado: uf };
  const skip   = (page - 1) * LIMIT;

  const [docs, total, cidades, stats] = await Promise.all([
    col.find(filter).sort({ preco: 1 }).skip(skip).limit(LIMIT)
      .project({
        _id: 1, hdnImovel: 1, estado: 1, cidade: 1, bairro: 1,
        endereco: 1, preco: 1, precoAval: 1, desconto: 1,
        modalidade: 1, financiamento: 1, tipo: 1,
        areaTotal: 1, areaUtil: 1, quartos: 1, vagas: 1,
        fotoUrl: 1, urlDetalhe: 1,
      }).toArray(),

    col.countDocuments(filter),

    col.aggregate([
      { $match: filter },
      { $group: { _id: "$cidade", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 12 },
    ]).toArray(),

    col.aggregate([
      { $match: { ...filter, preco: { $ne: null } } },
      { $group: { _id: null, media: { $avg: "$preco" }, min: { $min: "$preco" } } },
    ]).toArray(),
  ]);

  return {
    imoveis:    docs.map((d) => ({ ...d, _id: d._id.toString() })) as Imovel[],
    total,
    page,
    totalPages: Math.ceil(total / LIMIT),
    cidades,
    precoMedio: stats[0]?.media ?? null,
    precoMin:   stats[0]?.min   ?? null,
  };
}

export default async function EstadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ estado: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { estado }  = await params;
  const sp          = await searchParams;
  const uf          = estado.toUpperCase();
  const nomeEstado  = ESTADO_NOMES[uf];
  if (!nomeEstado) notFound();

  const page = Math.max(1, parseInt(sp.page || "1"));
  const data = await getData(uf, page);

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-400 mb-4">
        <a href="/" className="hover:underline">Início</a>
        <span className="mx-1">›</span>
        <span className="text-gray-600 font-medium">Imóveis em {nomeEstado}</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Imóveis Caixa em {nomeEstado} ({uf})
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {data.total.toLocaleString("pt-BR")} imóveis disponíveis · Preço médio {fmtBRL(data.precoMedio)} · A partir de {fmtBRL(data.precoMin)}
        </p>
      </div>

      {/* Cidades */}
      {data.cidades.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <h2 className="font-semibold text-gray-700 text-sm mb-3">Cidades com mais imóveis</h2>
          <div className="flex flex-wrap gap-2">
            {data.cidades.map((c) => (
              <a
                key={c._id}
                href={`/imoveis/${estado}/${slugify(c._id)}`}
                className="flex items-center gap-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-sm px-3 py-1.5 rounded-full transition-colors"
              >
                <span className="text-gray-700">{c._id}</span>
                <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">{c.total}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Cards */}
      {data.imoveis.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🔍</p>
          <p>Nenhum imóvel encontrado em {nomeEstado}.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.imoveis.map((im) => (
              <CardImovel key={im.hdnImovel} imovel={im} />
            ))}
          </div>
          <Paginacao page={data.page} totalPages={data.totalPages} total={data.total} />
        </>
      )}

      {/* Link outros estados */}
      <div className="mt-10 pt-6 border-t">
        <p className="text-sm text-gray-500 mb-3">Explorar outros estados:</p>
        <div className="flex flex-wrap gap-2">
          {ALL_ESTADOS.filter((uf2) => uf2 !== uf).map((uf2) => (
            <a
              key={uf2}
              href={`/imoveis/${uf2.toLowerCase()}`}
              className="text-xs bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 px-3 py-1.5 rounded-full transition-colors"
            >
              {uf2}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
