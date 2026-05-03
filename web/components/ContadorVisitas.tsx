"use client";

import { useEffect, useState } from "react";

interface Stats {
  total: number;
  diario: number;
  mensal: number;
}

function fmtN(n: number) {
  return n.toLocaleString("pt-BR");
}

export default function ContadorVisitas() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    // Registra visita uma única vez por sessão
    if (!sessionStorage.getItem("visitou")) {
      sessionStorage.setItem("visitou", "1");
      fetch("/api/visita", { method: "POST" });
    }

    // Busca contadores para exibir
    fetch("/api/visita")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) return null;

  return (
    <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-400 mt-3">
      <span>
        👁 Hoje:{" "}
        <strong className="text-gray-500">{fmtN(stats.diario)}</strong>
      </span>
      <span>
        📅 Este mês:{" "}
        <strong className="text-gray-500">{fmtN(stats.mensal)}</strong>
      </span>
      <span>
        🌐 Total:{" "}
        <strong className="text-gray-500">{fmtN(stats.total)}</strong>
      </span>
    </div>
  );
}
