"use client";

import { Imovel } from "@/lib/types";
import BotaoFavorito from "./BotaoFavorito";

function fmt(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function CardImovel({ imovel }: { imovel: Imovel }) {
  const descPct = imovel.precoAval && imovel.preco
    ? Math.round((1 - imovel.preco / imovel.precoAval) * 100)
    : null;

  return (
    <div className="relative group">
      <BotaoFavorito imovel={imovel} />

      <a
        href={`/imovel/${imovel.hdnImovel}`}
        className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full"
      >
        {/* Foto */}
        <div className="relative h-44 bg-gray-200 overflow-hidden">
          {imovel.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imovel.fotoUrl}
              alt={imovel.tipo || "Imóvel"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">🏠</div>
          )}
          {descPct && descPct > 0 && (
            <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              -{descPct}%
            </span>
          )}
          <span className="absolute bottom-2 left-2 bg-brand-900 text-white text-xs px-2 py-1 rounded-full">
            {imovel.modalidade || "Venda"}
          </span>
        </div>

        {/* Conteúdo */}
        <div className="p-3 flex flex-col gap-1 flex-1">
          <p className="font-bold text-brand-900 text-lg leading-tight">{fmt(imovel.preco)}</p>
          {imovel.precoAval && (
            <p className="text-xs text-gray-400 line-through">{fmt(imovel.precoAval)}</p>
          )}

          <p className="text-sm text-gray-700 font-medium mt-1">
            {imovel.tipo || "Imóvel"} — {imovel.estado}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {imovel.bairro ? `${imovel.bairro}, ` : ""}{imovel.cidade}
          </p>

          <div className="flex gap-3 mt-2 text-xs text-gray-600 flex-wrap">
            {imovel.areaTotal && <span>📐 {imovel.areaTotal}m²</span>}
            {imovel.quartos   && <span>🛏 {imovel.quartos} qto{imovel.quartos > 1 ? "s" : ""}</span>}
            {imovel.vagas     && <span>🚗 {imovel.vagas} vaga{imovel.vagas > 1 ? "s" : ""}</span>}
          </div>

          {imovel.financiamento?.toLowerCase().includes("sim") && (
            <span className="mt-2 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded w-fit">
              ✓ Aceita financiamento
            </span>
          )}
        </div>
      </a>
    </div>
  );
}
