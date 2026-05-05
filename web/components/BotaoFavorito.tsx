"use client";

import { useEffect, useState } from "react";
import { Imovel } from "@/lib/types";

const KEY = "favoritos_v1";

export function getFavoritos(): Imovel[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function salvar(lista: Imovel[]) {
  localStorage.setItem(KEY, JSON.stringify(lista));
}

interface Props {
  imovel: Imovel;
  variant?: "card" | "inline";
}

export default function BotaoFavorito({ imovel, variant = "card" }: Props) {
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    setSalvo(getFavoritos().some((f) => f.hdnImovel === imovel.hdnImovel));
  }, [imovel.hdnImovel]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const atual = getFavoritos();
    if (salvo) {
      salvar(atual.filter((f) => f.hdnImovel !== imovel.hdnImovel));
      setSalvo(false);
    } else {
      salvar([...atual, imovel]);
      setSalvo(true);
    }
  }

  if (variant === "inline") {
    return (
      <button
        onClick={toggle}
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
    );
  }

  return (
    <button
      onClick={toggle}
      title={salvo ? "Remover dos favoritos" : "Salvar nos favoritos"}
      className="absolute top-2 left-2 z-10 bg-white/80 hover:bg-white rounded-full w-8 h-8 flex items-center justify-center shadow transition-colors"
    >
      <span className={`text-lg leading-none ${salvo ? "text-red-500" : "text-gray-400"}`}>
        {salvo ? "♥" : "♡"}
      </span>
    </button>
  );
}
