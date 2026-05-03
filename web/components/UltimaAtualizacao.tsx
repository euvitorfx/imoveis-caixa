"use client";

import { useEffect, useState } from "react";

function tempoRelativo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60)   return "agora mesmo";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400)return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)} dia${Math.floor(diff / 86400) > 1 ? "s" : ""}`;
}

export default function UltimaAtualizacao() {
  const [info, setInfo] = useState<{ lastSync: string | null; totalImoveis: number } | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setInfo);
  }, []);

  if (!info?.lastSync) return null;

  return (
    <span className="text-xs text-blue-200 hidden sm:inline">
      🕒 Atualizado {tempoRelativo(info.lastSync)} &nbsp;·&nbsp;
      {info.totalImoveis.toLocaleString("pt-BR")} imóveis
    </span>
  );
}
