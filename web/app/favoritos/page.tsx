"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Imovel } from "@/lib/types";
import CardImovel from "@/components/CardImovel";
import { useFavoritos } from "@/components/FavoritosProvider";

type Mudanca = { campo: string; de: unknown; para: unknown };
type ImovelFav = Imovel & { mudancas?: Mudanca[] };

type Ordenacao = "mudancas" | "preco_asc" | "preco_desc" | "adicao";

function getPrecoDe(mudancas?: Mudanca[]): number | undefined {
  const m = mudancas?.find((m) => m.campo === "preco" && typeof m.de === "number");
  return m ? (m.de as number) : undefined;
}

function ordenar(lista: ImovelFav[], ord: Ordenacao, favIds: string[]): ImovelFav[] {
  const copia = [...lista];
  if (ord === "mudancas") {
    return copia.sort((a, b) => (b.mudancas?.length ?? 0) - (a.mudancas?.length ?? 0));
  }
  if (ord === "preco_asc") {
    return copia.sort((a, b) => (a.preco ?? Infinity) - (b.preco ?? Infinity));
  }
  if (ord === "preco_desc") {
    return copia.sort((a, b) => (b.preco ?? -Infinity) - (a.preco ?? -Infinity));
  }
  // adicao — preserva a ordem original dos favoritos
  return copia.sort((a, b) => favIds.indexOf(a.hdnImovel) - favIds.indexOf(b.hdnImovel));
}

export default function FavoritosPage() {
  const { data: session, status } = useSession();
  const { favoritos: favIds } = useFavoritos();
  const [imoveis, setImoveis] = useState<ImovelFav[] | null>(null);
  const [removidos, setRemovidos] = useState<ImovelFav[]>([]);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("mudancas");
  const [mostrarRemovidos, setMostrarRemovidos] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { setImoveis([]); return; }
    if (status !== "authenticated") return;
    if (favIds.length === 0) { setImoveis([]); return; }

    const params = new URLSearchParams({ ids: favIds.join(","), limit: "100" });
    fetch(`/api/imoveis/favoritos?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setImoveis(d.imoveis ?? []);
        setRemovidos(d.removidos ?? []);
      });
  }, [status, favIds]);

  if (status === "loading" || imoveis === null) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-4xl mb-3">♡</p>
        <p>Carregando...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-5xl mb-4">♡</p>
        <p className="text-lg font-medium text-gray-500">Faça login para ver seus favoritos</p>
        <p className="text-sm mt-2 text-gray-400">Salve imóveis e acesse de qualquer dispositivo.</p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <a
            href="/login?callbackUrl=/favoritos"
            className="px-6 py-2.5 rounded-xl font-medium text-sm text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#01304D" }}
          >
            Entrar
          </a>
          <a
            href="/cadastro"
            className="px-6 py-2.5 rounded-xl font-medium text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Criar conta grátis
          </a>
        </div>
      </div>
    );
  }

  const plano = (session?.user as { plano?: string })?.plano ?? "gratuito";
  const comMudanca = imoveis.filter((im) => (im.mudancas?.length ?? 0) > 0).length;
  const lista = ordenar(imoveis, ordenacao, favIds);

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Meus Favoritos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {favIds.length} imóvel{favIds.length !== 1 ? "s" : ""} salvo{favIds.length !== 1 ? "s" : ""}
            {plano === "gratuito" && (
              <span className="text-gray-400"> · limite {favIds.length}/10 no plano gratuito</span>
            )}
            {comMudanca > 0 && (
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {comMudanca} com novidade{comMudanca !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        {/* Ordenação */}
        {imoveis.length > 1 && (
          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="mudancas">Recém atualizados</option>
            <option value="preco_asc">Menor preço</option>
            <option value="preco_desc">Maior preço</option>
            <option value="adicao">Ordem de adição</option>
          </select>
        )}
      </div>

      {/* Lista principal */}
      {imoveis.length === 0 && removidos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">♡</p>
          <p className="text-lg font-medium text-gray-500">Nenhum favorito ainda</p>
          <p className="text-sm mt-2">Clique no coração em qualquer imóvel para salvá-lo aqui.</p>
          <a href="/" className="inline-block mt-6 hover:underline text-sm" style={{ color: "#01304D" }}>
            ← Buscar imóveis
          </a>
        </div>
      ) : (
        <>
          {imoveis.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {lista.map((im) => (
                <CardImovel
                  key={im.hdnImovel}
                  imovel={im}
                  hasMudanca={(im.mudancas?.length ?? 0) > 0}
                  precoDe={getPrecoDe(im.mudancas)}
                />
              ))}
            </div>
          )}

          {/* Removidos do acervo */}
          {removidos.length > 0 && (
            <div className="mt-10">
              <button
                onClick={() => setMostrarRemovidos((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-orange-700 hover:text-orange-800 transition-colors mb-4"
              >
                <span>{mostrarRemovidos ? "▲" : "▼"}</span>
                <span>
                  {removidos.length} imóvel{removidos.length !== 1 ? "is" : ""} removido{removidos.length !== 1 ? "s" : ""} do acervo
                </span>
              </button>

              {mostrarRemovidos && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {removidos.map((im) => (
                    <CardImovel
                      key={im.hdnImovel}
                      imovel={im}
                      removido
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
