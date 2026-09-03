"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import CardImovel from "@/components/CardImovel";
import Paginacao from "@/components/Paginacao";
import { Imovel } from "@/lib/types";

interface PageData {
  imoveis:    Imovel[];
  total:      number;
  page:       number;
  totalPages: number;
}

interface Props {
  initialData: PageData;
}

const FILTER_KEYS = [
  "estado","cidade","bairro","endereco","tipo","modalidade",
  "precoMin","precoMax","areaMin","areaMax","quartos","vagas","suites",
  "ocupacao","fgts","leilaoAgendado","financiamento","descontoMin","ordenar",
];

function isFiltered(sp: URLSearchParams): boolean {
  return FILTER_KEYS.some((k) => sp.has(k)) || parseInt(sp.get("page") || "1") > 1;
}

export default function ListagemHome({ initialData }: Props) {
  const sp = useSearchParams();

  const filtered = isFiltered(sp);
  const [data,    setData]    = useState<PageData>(filtered ? { imoveis: [], total: 0, page: 1, totalPages: 0 } : initialData);
  const [loading, setLoading] = useState(filtered);

  useEffect(() => {
    if (!isFiltered(sp)) {
      setData(initialData);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/imoveis/busca?${sp.toString()}`)
      .then((r) => r.json())
      .then((json: PageData) => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-400">
        <svg className="animate-spin h-6 w-6 mr-2" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Carregando imóveis...
      </div>
    );
  }

  if (data.imoveis.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-5xl mb-4">🔍</p>
        <p className="text-lg">Nenhum imóvel encontrado com esses filtros.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {data.imoveis.map((im) => (
          <CardImovel key={im.hdnImovel} imovel={im} />
        ))}
      </div>
      <Paginacao page={data.page} totalPages={data.totalPages} total={data.total} />
    </>
  );
}
