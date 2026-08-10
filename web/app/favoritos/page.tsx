"use client";

import { useEffect, useState } from "react";
import { Imovel } from "@/lib/types";
import CardImovel from "@/components/CardImovel";
import { getFavoritos } from "@/components/BotaoFavorito";

export default function FavoritosPage() {
  const [favoritos, setFavoritos] = useState<Imovel[] | null>(null);

  useEffect(() => {
    setFavoritos(getFavoritos());
    // atualiza se o usuário remover um favorito de dentro desta página
    const onStorage = () => setFavoritos(getFavoritos());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Meus Favoritos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Imóveis salvos neste dispositivo.
          </p>
        </div>
        {favoritos && favoritos.length > 0 && (
          <button
            onClick={() => {
              localStorage.removeItem("favoritos_v1");
              setFavoritos([]);
            }}
            className="text-xs text-red-500 hover:underline"
          >
            Limpar tudo
          </button>
        )}
      </div>

      {favoritos === null ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : favoritos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">♡</p>
          <p className="text-lg font-medium text-gray-500">Nenhum favorito ainda</p>
          <p className="text-sm mt-2">Clique no coração ♡ em qualquer imóvel para salvá-lo aqui.</p>
          <a href="/" className="inline-block mt-6 hover:underline text-sm" style={{ color: "#E83A3A" }}>
            ← Voltar à listagem
          </a>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{favoritos.length} imóvel{favoritos.length !== 1 ? "s" : ""} salvo{favoritos.length !== 1 ? "s" : ""}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favoritos.map((im) => (
              <CardImovel key={im.hdnImovel} imovel={im} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
