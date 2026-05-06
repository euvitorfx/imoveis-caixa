"use client";

import { useEffect, useState } from "react";

function fmtN(n: number) {
  return n.toLocaleString("pt-BR");
}

export default function ContadorVisitas() {
  const [diario,    setDiario]    = useState<number | null>(null);
  const [mensal,    setMensal]    = useState<number | null>(null);
  const [pageviews, setPageviews] = useState<number | null>(null);

  useEffect(() => {
    // Sessões de hoje e do mês vêm do contador MongoDB (por sessão)
    fetch("/api/visita")
      .then((r) => r.json())
      .then((d) => {
        setDiario(d.diario  ?? 0);
        setMensal(d.mensal  ?? 0);
      })
      .catch(() => {});

    // Pageviews totais vêm do Vercel Analytics (últimos 30 dias)
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { if (d.pageviews != null) setPageviews(d.pageviews); })
      .catch(() => {});
  }, []);

  if (diario === null && pageviews === null) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-2">
        Total de visitas no site
      </p>
      <div className="flex flex-wrap justify-center gap-6 text-xs text-blue-100">
        {diario !== null && (
          <span>
            👁 Hoje:{" "}
            <strong className="text-white">{fmtN(diario)}</strong>
          </span>
        )}
        {mensal !== null && (
          <span>
            📅 Este mês:{" "}
            <strong className="text-white">{fmtN(mensal)}</strong>
          </span>
        )}
        {pageviews !== null && (
          <span>
            📄 Páginas carregadas (30 dias):{" "}
            <strong className="text-white">{fmtN(pageviews)}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
