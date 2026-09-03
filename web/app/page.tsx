import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import Filtros from "@/components/Filtros";
import ListagemHome from "@/components/ListagemHome";
import { Imovel } from "@/lib/types";
import clientPromise from "@/lib/mongodb";
import { ALL_ESTADOS, ESTADO_NOMES, ESTADO_BANDEIRAS } from "@/lib/utils";
import BandeiraEstado from "@/components/BandeiraEstado";
import HeroCarousel from "@/components/HeroCarousel";
import HomePopup from "@/components/HomePopup";

export const revalidate = 300;

const LIMIT = 24;

async function getDefaultData() {
  const client = await clientPromise;
  const col    = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);
  const filter = { ativo: true };

  const [docs, total] = await Promise.all([
    col.find(filter).sort({ preco: 1 }).limit(LIMIT)
      .project({
        _id: 1, hdnImovel: 1, estado: 1, cidade: 1, bairro: 1,
        endereco: 1, preco: 1, precoAval: 1, desconto: 1,
        modalidade: 1, financiamento: 1, tipo: 1,
        areaTotal: 1, areaUtil: 1, quartos: 1, vagas: 1, suites: 1,
        fotoUrl: 1, urlDetalhe: 1, dataLeilao1: 1, dataLeilao1Date: 1,
        fgts: 1, ocupacao: 1,
      }).toArray(),
    col.countDocuments(filter),
  ]);

  return {
    imoveis:    docs.map((d) => ({ ...d, _id: d._id.toString() })) as Imovel[],
    total,
    page:       1,
    totalPages: Math.ceil(total / LIMIT),
  };
}

const getCachedDefaultData = unstable_cache(
  () => getDefaultData(),
  ["home-default"],
  { revalidate: 300 }
);

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

export default async function HomePage() {
  const initialData = await getCachedDefaultData();

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <HeroCarousel totalImoveis={initialData.total} totalBusca={initialData.total} />

      <div id="busca" className="pt-8 -mb-8" />
      <Suspense>
        <Filtros />
      </Suspense>

      <Suspense>
        <ListagemHome initialData={initialData} />
      </Suspense>

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
