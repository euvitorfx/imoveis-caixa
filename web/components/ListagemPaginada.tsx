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
  uf:          string;
  cidadeSlug?: string; // apenas para páginas de cidade
  initialData: PageData;
  nomeLugar:   string; // para mensagem de "Nenhum imóvel em X"
}

export default function ListagemPaginada({ uf, cidadeSlug, initialData, nomeLugar }: Props) {
  const sp      = useSearchParams();
  const page    = Math.max(1, parseInt(sp.get("page") || "1"));

  const [data,    setData]    = useState<PageData>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (page === 1) {
      setData(initialData);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ uf, page: String(page) });
    if (cidadeSlug) params.set("cidade", cidadeSlug);
    fetch(`/api/imoveis/listagem?${params}`)
      .then((r) => r.json())
      .then((json: PageData) => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, uf, cidadeSlug]);

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
        <p>Nenhum imóvel encontrado em {nomeLugar}.</p>
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
