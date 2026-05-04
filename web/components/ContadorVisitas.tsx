"use client";

import { useEffect, useState } from "react";

interface Stats {
  diario: number;
  mensal: number;
  pageviews: number;
}

function fmtN(n: number) {
  return n.toLocaleString("pt-BR");
}

export default function ContadorVisitas() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/visita")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-2">
        Total de visitas no site
      </p>
      <div className="flex flex-wrap justify-center gap-6 text-xs text-blue-100">
        <span>
          👁 Hoje:{" "}
          <strong className="text-white">{fmtN(stats.diario)}</strong>
        </span>
        <span>
          📅 Este mês:{" "}
          <strong className="text-white">{fmtN(stats.mensal)}</strong>
        </span>
        <span>
          📄 Páginas carregadas:{" "}
          <strong className="text-white">{fmtN(stats.pageviews)}</strong>
        </span>
      </div>
    </div>
  );
}
