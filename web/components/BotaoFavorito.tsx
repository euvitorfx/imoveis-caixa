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

export default function BotaoFavorito({ imovel }: { imovel: Imovel }) {
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
