"use client";

import { Imovel } from "@/lib/types";
import BotaoFavorito from "./BotaoFavorito";

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function CardImovel({ imovel }: { imovel: Imovel }) {
  const descPct = imovel.precoAval && imovel.preco
    ? Math.round((1 - imovel.preco / imovel.precoAval) * 100)
    : null;

  const economia = imovel.precoAval && imovel.preco && imovel.precoAval > imovel.preco
    ? imovel.precoAval - imovel.preco
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

          {/* Desconto — top right */}
          {descPct && descPct > 0 && (
            <span
              className="absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full"
              style={{ backgroundColor: "#F59E0B", color: "#1C1917" }}
            >
              -{descPct}%
            </span>
          )}

          {/* Badge strip — bottom left */}
          <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap max-w-[85%]">
            <span
              className="text-white text-xs px-2 py-0.5 rounded-full shrink-0"
              style={{ backgroundColor: "#01304D" }}
            >
              {imovel.modalidade || "Venda"}
            </span>
            {imovel.ocupacao === "Desocupado" && (
              <span className="text-xs font-semibold bg-green-500 text-white px-2 py-0.5 rounded-full">
                Desocupado
              </span>
            )}
            {imovel.fgts && (
              <span className="text-xs font-semibold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                FGTS
              </span>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-3 flex flex-col gap-1 flex-1">
          {/* Tipo + localização */}
          <p className="text-xs text-gray-500 truncate">
            {imovel.tipo || "Imóvel"}
            {" · "}
            {imovel.bairro ? `${imovel.bairro}, ` : ""}
            {imovel.cidade}/{imovel.estado}
          </p>

          {/* Preço */}
          <p className="font-bold text-gray-900 text-lg leading-tight">{fmt(imovel.preco)}</p>

          {/* Avaliação + Economia */}
          {imovel.precoAval && (
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-xs text-gray-400 line-through">{fmt(imovel.precoAval)}</p>
              {economia && (
                <span className="text-xs font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                  economia {fmt(economia)}
                </span>
              )}
            </div>
          )}

          {/* Características */}
          {(imovel.areaTotal || imovel.quartos || imovel.suites || imovel.vagas) && (
            <div className="flex gap-2 mt-1 text-xs text-gray-500 flex-wrap">
              {imovel.areaTotal && <span>📐 {imovel.areaTotal}m²</span>}
              {imovel.quartos   && <span>🛏 {imovel.quartos} qto{imovel.quartos > 1 ? "s" : ""}</span>}
              {imovel.suites    && <span>🚿 {imovel.suites} suíte{imovel.suites > 1 ? "s" : ""}</span>}
              {imovel.vagas     && <span>🚗 {imovel.vagas} vaga{imovel.vagas > 1 ? "s" : ""}</span>}
            </div>
          )}

          {/* Prévia da descrição IA */}
          {imovel.descricao && (
            <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mt-1">
              {imovel.descricao}
            </p>
          )}

          {/* Badges de condição — empurra para o fundo com mt-auto */}
          {(imovel.dataLeilao1 || imovel.financiamento?.toLowerCase().includes("sim")) && (
            <div className="flex flex-wrap gap-1 mt-auto pt-2">
              {imovel.dataLeilao1 && (
                <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                  🔨 {imovel.dataLeilao1}
                </span>
              )}
              {imovel.financiamento?.toLowerCase().includes("sim") && (
                <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  ✓ Financiamento
                </span>
              )}
            </div>
          )}
        </div>
      </a>
    </div>
  );
}
