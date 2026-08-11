import { Metadata } from "next";
import { notFound } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import CardImovel from "@/components/CardImovel";
import Paginacao from "@/components/Paginacao";
import { Imovel } from "@/lib/types";

export const dynamic = "force-dynamic";
import { SITE_URL, SITE_NAME } from "@/lib/config";
import { slugify, ESTADO_NOMES, fmtBRL } from "@/lib/utils";

const LIMIT = 24;

async function getCidadeReal(uf: string, cidadeSlug: string): Promise<string | null> {
  const client = await clientPromise;
  const col    = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);
  const cidades = await col.distinct("cidade", { estado: uf, ativo: true }) as string[];
  return cidades.find((c) => slugify(c) === cidadeSlug) ?? null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ estado: string; cidade: string }> }
): Promise<Metadata> {
  const { estado, cidade } = await params;
  const uf        = estado.toUpperCase();
  const nomeEstado = ESTADO_NOMES[uf];
  if (!nomeEstado) return {};

  const cidadeReal = await getCidadeReal(uf, cidade);
  if (!cidadeReal) return {};

  const title = `Imóveis Caixa em ${cidadeReal}/${uf}`;
  const desc  = `Imóveis da Caixa Econômica Federal disponíveis em ${cidadeReal}, ${nomeEstado}. Leilões e vendas diretas. Atualizado diariamente.`;

  return {
    title,
    description: desc,
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description: desc,
      url: `${SITE_URL}/imoveis/${estado}/${cidade}`,
    },
    alternates: { canonical: `${SITE_URL}/imoveis/${estado}/${cidade}` },
  };
}

async function getData(uf: string, cidadeReal: string, page: number) {
  const client = await clientPromise;
  const col    = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);
  const filter = { ativo: true, estado: uf, cidade: { $regex: `^${cidadeReal}$`, $options: "i" } };
  const skip   = (page - 1) * LIMIT;

  const [docs, total, stats] = await Promise.all([
    col.find(filter).sort({ preco: 1 }).skip(skip).limit(LIMIT)
      .project({
        _id: 1, hdnImovel: 1, estado: 1, cidade: 1, bairro: 1,
        endereco: 1, preco: 1, precoAval: 1, desconto: 1,
        modalidade: 1, financiamento: 1, tipo: 1,
        areaTotal: 1, areaUtil: 1, quartos: 1, vagas: 1, suites: 1,
        fotoUrl: 1, urlDetalhe: 1, dataLeilao1: 1,
        fgts: 1, ocupacao: 1,
      }).toArray(),

    col.countDocuments(filter),

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
    precoMedio: stats[0]?.media ?? null,
    precoMin:   stats[0]?.min   ?? null,
  };
}

export default async function CidadePage({
  params,
  searchParams,
}: {
  params: Promise<{ estado: string; cidade: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { estado, cidade } = await params;
  const sp        = await searchParams;
  const uf        = estado.toUpperCase();
  const nomeEstado = ESTADO_NOMES[uf];
  if (!nomeEstado) notFound();

  const cidadeReal = await getCidadeReal(uf, cidade);
  if (!cidadeReal) notFound();

  const page = Math.max(1, parseInt(sp.page || "1"));
  const data = await getData(uf, cidadeReal, page);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início",                              item: SITE_URL },
      { "@type": "ListItem", position: 2, name: `Imóveis em ${nomeEstado} (${uf})`,    item: `${SITE_URL}/imoveis/${estado}` },
      { "@type": "ListItem", position: 3, name: `Imóveis em ${cidadeReal}/${uf}` },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-400 mb-4">
        <a href="/" className="hover:underline">Início</a>
        <span className="mx-1">›</span>
        <a href={`/imoveis/${estado}`} className="hover:underline">{nomeEstado}</a>
        <span className="mx-1">›</span>
        <span className="text-gray-600 font-medium">{cidadeReal}</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Imóveis Caixa em {cidadeReal}/{uf}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {data.total.toLocaleString("pt-BR")} imóveis disponíveis
          {data.precoMedio ? ` · Preço médio ${fmtBRL(data.precoMedio)}` : ""}
          {data.precoMin   ? ` · A partir de ${fmtBRL(data.precoMin)}`   : ""}
        </p>
      </div>

      {/* Cards */}
      {data.imoveis.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🔍</p>
          <p>Nenhum imóvel encontrado em {cidadeReal}.</p>
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

      {/* Voltar para o estado */}
      <div className="mt-8 pt-4 border-t">
        <a href={`/imoveis/${estado}`} className="text-sm hover:underline" style={{ color: "#01304D" }}>
          ← Ver todos os imóveis em {nomeEstado}
        </a>
      </div>
    </div>
  );
}
