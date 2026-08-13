"use client";

import { useState } from "react";
import { useFavoritos } from "./FavoritosProvider";
import { useSession } from "next-auth/react";
import { Imovel } from "@/lib/types";
import { useRouter } from "next/navigation";
import ModalCompletarCadastro from "./ModalCompletarCadastro";

interface Props {
  imovel: Imovel;
  variant?: "card" | "inline";
}

export default function BotaoFavorito({ imovel, variant = "card" }: Props) {
  const { favoritos, toggleFavorito } = useFavoritos();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const salvo = favoritos.includes(imovel.hdnImovel);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!session?.user?.temTelefone) {
      setShowModal(true);
      return;
    }
    toggleFavorito(imovel.hdnImovel);
  }

  const modal = showModal ? <ModalCompletarCadastro onClose={() => setShowModal(false)} /> : null;

  if (variant === "inline") {
    return (
      <>
        {modal}
        <button
          onClick={handleClick}
          title={salvo ? "Remover dos favoritos" : "Salvar nos favoritos"}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            salvo
              ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <span className="text-base leading-none">{salvo ? "♥" : "♡"}</span>
          {salvo ? "Salvo nos favoritos" : "Salvar nos favoritos"}
        </button>
      </>
    );
  }

  return (
    <>
      {modal}
      <button
        onClick={handleClick}
        title={salvo ? "Remover dos favoritos" : "Salvar nos favoritos"}
        className="absolute top-2 left-2 z-10 bg-white/80 hover:bg-white rounded-full w-8 h-8 flex items-center justify-center shadow transition-colors"
      >
        <span className={`text-lg leading-none ${salvo ? "text-red-500" : "text-gray-400"}`}>
          {salvo ? "♥" : "♡"}
        </span>
      </button>
    </>
  );
}
