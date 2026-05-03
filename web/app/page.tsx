import { Suspense } from "react";
import Filtros from "@/components/Filtros";
import CardImovel from "@/components/CardImovel";
import Paginacao from "@/components/Paginacao";
import { Imovel } from "@/lib/types";
import clientPromise from "@/lib/mongodb";

interface SearchParams {
  estado?: string;
  cidade?: string;
  bairro?: string;
  tipo?: string;
  modalidade?: string;
  precoMin?: string;
  precoMax?: string;
  quartos?: string;
  financiamento?: string;
  page?: string;
}

const LIMIT = 24;

async function queryImoveis(sp: SearchParams) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { ativo: true };

  if (sp.estado)     filter.estado     = sp.estado.toUpperCase();
  if (sp.cidade)     filter.cidade     = { $regex: sp.cidade, $options: "i" };
  if (sp.bairro)     filter.bairro     = { $regex: sp.bairro, $options: "i" };
  if (sp.tipo)       filter.tipo       = { $regex: sp.tipo,   $options: "i" };
  if (sp.modalidade) filter.modalidade = { $regex: sp.modalidade, $options: "i" };
  if (sp.financiamento === "sim") filter.financiamento = { $regex: "sim", $options: "i" };
  if (sp.quartos)    filter.quartos    = { $gte: parseInt(sp.quartos) };

  if (sp.precoMin || sp.precoMax) {
    filter.preco = {};
    if (sp.precoMin) filter.preco.$gte = parseFloat(sp.precoMin);
    if (sp.precoMax) filter.preco.$lte = parseFloat(sp.precoMax);
  }

  const page  = Math.max(1, parseInt(sp.page || "1"));
  const skip  = (page - 1) * LIMIT;

  const client = await clientPromise;
  const col    = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);

  const [docs, total] = await Promise.all([
    col
      .find(filter)
      .sort({ preco: 1 })
      .skip(skip)
      .limit(LIMIT)
      .project({
        _id: 1, hdnImovel: 1, estado: 1, cidade: 1, bairro: 1,
        endereco: 1, preco: 1, precoAval: 1, desconto: 1,
        modalidade: 1, financiamento: 1, tipo: 1,
        areaTotal: 1, areaUtil: 1, quartos: 1, vagas: 1,
        fotoUrl: 1, urlDetalhe: 1,
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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp   = await searchParams;
  const data = await queryImoveis(sp);

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
    </div>
  );
}
