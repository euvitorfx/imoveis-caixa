import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import Filtros from "@/components/Filtros";
import CardImovel from "@/components/CardImovel";
import Paginacao from "@/components/Paginacao";
import { Imovel } from "@/lib/types";
import { Sort } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { ALL_ESTADOS, ESTADO_NOMES, ESTADO_BANDEIRAS } from "@/lib/utils";
import BandeiraEstado from "@/components/BandeiraEstado";
import HeroCarousel from "@/components/HeroCarousel";
import HomePopup from "@/components/HomePopup";

export const dynamic = "force-dynamic";

interface SearchParams {
  estado?: string;
  cidade?: string;
  bairro?: string;
  endereco?: string;
  tipo?: string;
  modalidade?: string;
  precoMin?: string;
  precoMax?: string;
  areaMin?: string;
  areaMax?: string;
  quartos?: string;
  vagas?: string;
  suites?: string;
  ocupacao?: string;
  fgts?: string;
  leilaoAgendado?: string;
  financiamento?: string;
  descontoMin?: string;
  ordenar?: string;
  page?: string;
}

const LIMIT = 24;

function parseList(val: string | undefined): string[] {
  if (!val) return [];
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

async function queryImoveis(sp: SearchParams) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { ativo: true };

  const estadoList = parseList(sp.estado);
  const cidadeList = parseList(sp.cidade);
  const bairroList = parseList(sp.bairro);
  const tipoList   = parseList(sp.tipo);
  const modalList  = parseList(sp.modalidade);

  if (estadoList.length === 1) filter.estado = estadoList[0].toUpperCase();
  else if (estadoList.length > 1) filter.estado = { $in: estadoList.map((s) => s.toUpperCase()) };

  if (cidadeList.length === 1) filter.cidade = { $regex: cidadeList[0], $options: "i" };
  else if (cidadeList.length > 1) filter.cidade = { $in: cidadeList };

  if (bairroList.length === 1) filter.bairro = { $regex: bairroList[0], $options: "i" };
  else if (bairroList.length > 1) filter.bairro = { $in: bairroList };

  if (sp.endereco) filter.endereco = { $regex: sp.endereco, $options: "i" };

  if (tipoList.length === 1) filter.tipo = { $regex: tipoList[0], $options: "i" };
  else if (tipoList.length > 1) filter.tipo = { $in: tipoList };

  if (modalList.length === 1) filter.modalidade = { $regex: modalList[0], $options: "i" };
  else if (modalList.length > 1) filter.modalidade = { $in: modalList };
  if (sp.financiamento === "sim") filter.financiamento = { $regex: "sim", $options: "i" };
  if (sp.quartos)  filter.quartos  = { $gte: parseInt(sp.quartos) };
  if (sp.vagas)    filter.vagas    = { $gte: parseInt(sp.vagas) };
  if (sp.suites)   filter.suites   = { $gte: parseInt(sp.suites) };
  if (sp.ocupacao) filter.ocupacao = { $regex: sp.ocupacao, $options: "i" };
  if (sp.fgts === "sim") filter.fgts = true;
  if (sp.leilaoAgendado === "sim") filter.dataLeilao1Date = { $gte: new Date() };
  if (sp.descontoMin) {
    const pct = parseInt(sp.descontoMin) / 100;
    filter.$expr = { $gte: [{ $subtract: [1, { $divide: ["$preco", "$precoAval"] }] }, pct] };
  }

  if (sp.precoMin || sp.precoMax) {
    filter.preco = {};
    if (sp.precoMin) filter.preco.$gte = parseFloat(sp.precoMin);
    if (sp.precoMax) filter.preco.$lte = parseFloat(sp.precoMax);
  }
  if (sp.areaMin || sp.areaMax) {
    filter.areaTotal = {};
    if (sp.areaMin) filter.areaTotal.$gte = parseFloat(sp.areaMin);
    if (sp.areaMax) filter.areaTotal.$lte = parseFloat(sp.areaMax);
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
  const sort = SORT_MAP[sp.ordenar || "preco_asc"] ?? { preco: 1 };

  const page  = Math.max(1, parseInt(sp.page || "1"));
  const skip  = (page - 1) * LIMIT;

  const client = await clientPromise;
  const col    = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);

  const [docs, total] = await Promise.all([
    col
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(LIMIT)
      .project({
        _id: 1, hdnImovel: 1, estado: 1, cidade: 1, bairro: 1,
        endereco: 1, preco: 1, precoAval: 1, desconto: 1,
        modalidade: 1, financiamento: 1, tipo: 1,
        areaTotal: 1, areaUtil: 1, quartos: 1, vagas: 1, suites: 1,
        fotoUrl: 1, urlDetalhe: 1, dataLeilao1: 1, dataLeilao1Date: 1,
        fgts: 1, ocupacao: 1,
      })
      .toArray(),
    col.countDocuments(filter),
  ]);

  return {
    imoveis: docs.map((d) => ({ ...d, _id: d._id.toString() })) as Imovel[],
    total,
    page,
    totalPages: Math.ceil(total / LIMIT),
  };
}

async function getTotalImoveis(): Promise<number> {
  try {
    const client = await clientPromise;
    return client
      .db(process.env.MONGODB_DB)
      .collection(process.env.MONGODB_COLLECTION!)
      .countDocuments({ ativo: true });
  } catch {
    return 0;
  }
}

const getCachedImoveis = unstable_cache(
  async (sp: SearchParams) => queryImoveis(sp),
  ["home-imoveis"],
  { revalidate: 300 }
);

const getCachedTotal = unstable_cache(
  async () => getTotalImoveis(),
  ["home-total"],
  { revalidate: 3600 }
);

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const [data, totalImoveis] = await Promise.all([getCachedImoveis(sp), getCachedTotal()]);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "O que são os imóveis da Caixa Econômica Federal?",
        acceptedAnswer: { "@type": "Answer", text: "São imóveis retomados ou leiloados pela Caixa Econômica Federal, disponíveis para compra com preços abaixo do mercado nas modalidades leilão, venda online e venda direta." },
      },
      {
        "@type": "Question",
        name: "Como funciona o leilão de imóveis da Caixa?",
        acceptedAnswer: { "@type": "Answer", text: "Os imóveis são ofertados em leilões presenciais ou online. O maior lance arrematante fica com o imóvel. É possível financiar parte do valor pela própria Caixa em muitos casos." },
      },
      {
        "@type": "Question",
        name: "É possível financiar imóvel da Caixa?",
        acceptedAnswer: { "@type": "Answer", text: "Sim. Muitos imóveis da Caixa aceitam financiamento pela Caixa Econômica Federal, inclusive com uso do FGTS. Use o filtro 'Aceita financiamento' para encontrá-los." },
      },
      {
        "@type": "Question",
        name: "Como filtrar imóveis por estado ou cidade?",
        acceptedAnswer: { "@type": "Answer", text: "Use os filtros disponíveis na listagem para selecionar estado, cidade, bairro, tipo, modalidade, faixa de preço e outras características. Você também pode navegar diretamente pela página de cada estado." },
      },
      {
        "@type": "Question",
        name: "Com que frequência os dados são atualizados?",
        acceptedAnswer: { "@type": "Answer", text: "Os dados são obtidos diretamente do site da Caixa Econômica Federal e atualizados automaticamente 3 vezes ao dia: às 3h, 10h e 18h (horário de Brasília)." },
      },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <HeroCarousel totalImoveis={totalImoveis} totalBusca={data.total} />

      <div id="busca" className="pt-8 -mb-8" />
      <Suspense>
        <Filtros />
      </Suspense>

      {data.imoveis.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-lg">Nenhum imóvel encontrado com esses filtros.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.imoveis.map((im) => (
              <CardImovel key={im.hdnImovel} imovel={im} />
            ))}
          </div>

          <Suspense>
            <Paginacao
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
            />
          </Suspense>
        </>
      )}

      <HomePopup />

      {/* Explorar por estado */}
      <div className="mt-12 pt-6 border-t border-gray-200">
        <h2
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: "#01304D" }}
        >
          Explorar por estado
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
          {ALL_ESTADOS.map((uf) => (
            <a
              key={uf}
              href={`/imoveis/${uf.toLowerCase()}`}
              className="flex flex-col items-center bg-white hover:bg-sky-50 border border-gray-200 hover:border-[#01304D] rounded-lg px-2 py-2 transition-colors gap-1"
            >
              <BandeiraEstado
                src={ESTADO_BANDEIRAS[uf]}
                alt={`Bandeira ${ESTADO_NOMES[uf]}`}
                className="h-6 w-auto object-contain"
              />
              <span className="text-sm font-bold text-gray-800">{uf}</span>
              <span className="text-xs text-gray-400 truncate w-full text-center">{ESTADO_NOMES[uf]}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
