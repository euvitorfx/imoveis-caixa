import { Suspense } from "react";
import Filtros from "@/components/Filtros";
import CardImovel from "@/components/CardImovel";
import Paginacao from "@/components/Paginacao";
import { Imovel } from "@/lib/types";

interface SearchParams {
  estado?: string;
  cidade?: string;
  tipo?: string;
  modalidade?: string;
  precoMin?: string;
  precoMax?: string;
  quartos?: string;
  financiamento?: string;
  page?: string;
}

async function fetchImoveis(params: SearchParams) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  const res = await fetch(`${baseUrl}/api/imoveis?${qs.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) return { imoveis: [], total: 0, page: 1, totalPages: 1 };
  return res.json();
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp     = await searchParams;
  const page   = parseInt(sp.page || "1");
  const data   = await fetchImoveis({ ...sp, page: String(page) });
  const imoveis: Imovel[] = data.imoveis || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Imóveis Caixa</h1>
        <p className="text-gray-500 text-sm mt-1">
          Leilões, vendas online e venda direta em todo o Brasil. Atualizado diariamente.
        </p>
      </div>

      <Suspense>
        <Filtros />
      </Suspense>

      {imoveis.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-lg">Nenhum imóvel encontrado com esses filtros.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {imoveis.map((im) => (
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
    </div>
  );
}
