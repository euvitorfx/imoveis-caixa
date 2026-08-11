"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Imovel } from "@/lib/types";
import CardImovel from "@/components/CardImovel";
import { useFavoritos } from "@/components/FavoritosProvider";

export default function FavoritosPage() {
  const { data: session, status } = useSession();
  const { favoritos: favIds } = useFavoritos();
  const [imoveis, setImoveis] = useState<Imovel[] | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      setImoveis([]);
      return;
    }
    if (status !== "authenticated" || favIds.length === 0) {
      if (status === "authenticated") setImoveis([]);
      return;
    }

    // Busca os imóveis pelos IDs favoritados
    const params = new URLSearchParams({ ids: favIds.join(","), limit: "100" });
    fetch(`/api/imoveis/favoritos?${params}`)
      .then((r) => r.json())
      .then((d) => setImoveis(d.imoveis ?? []));
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
            href="/login"
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Meus Favoritos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {favIds.length} imóvel{favIds.length !== 1 ? "s" : ""} salvo{favIds.length !== 1 ? "s" : ""}
            {plano === "gratuito" && (
              <span className="text-gray-400"> · limite {favIds.length}/10 no plano gratuito</span>
            )}
          </p>
        </div>
      </div>

      {imoveis.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">♡</p>
          <p className="text-lg font-medium text-gray-500">Nenhum favorito ainda</p>
          <p className="text-sm mt-2">Clique no coração em qualquer imóvel para salvá-lo aqui.</p>
          <a href="/" className="inline-block mt-6 hover:underline text-sm" style={{ color: "#01304D" }}>
            ← Buscar imóveis
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {imoveis.map((im) => (
            <CardImovel key={im.hdnImovel} imovel={im} />
          ))}
        </div>
      )}
    </div>
  );
}
