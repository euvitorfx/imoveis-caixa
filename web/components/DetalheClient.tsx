"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import BotaoCompartilhar from "@/components/BotaoCompartilhar";
import BotaoPDF from "@/components/BotaoPDF";
import BotaoFavorito from "@/components/BotaoFavorito";
import GraficoPreco from "@/components/GraficoPreco";
import { Imovel } from "@/lib/types";

const MapaDetalhe = dynamic(() => import("@/components/MapaDetalhe"), { ssr: false });

interface Props {
  imovel: Imovel;
  titulo: string;
  preco: string;
  endereco: string;
  mapaLabel: string;
}

function Countdown({ dateStr }: { dateStr: string }) {
  const [remaining, setRemaining] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    function calc() {
      const diff = new Date(dateStr).getTime() - Date.now();
      if (diff <= 0) { setRemaining(null); return; }
      const days    = Math.floor(diff / 86_400_000);
      const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      setRemaining({ days, hours, minutes });
    }
    calc();
    const t = setInterval(calc, 60_000);
    return () => clearInterval(t);
  }, [dateStr]);

  if (!remaining) return null;

  return (
    <div className="mb-6 border border-orange-200 bg-orange-50 rounded-xl p-4">
      <p className="text-xs font-semibold text-orange-700 uppercase tracking-widest mb-3">
        🔨 Contagem regressiva para o leilão
      </p>
      <div className="flex items-center gap-0">
        {[
          { n: remaining.days,    s: remaining.days === 1    ? "dia"    : "dias"    },
          { n: remaining.hours,   s: remaining.hours === 1   ? "hora"   : "horas"   },
          { n: remaining.minutes, s: remaining.minutes === 1 ? "minuto" : "minutos" },
        ].map(({ n, s }, i) => (
          <div key={s} className="flex items-center">
            {i > 0 && <span className="text-orange-300 font-bold px-2 text-xl">:</span>}
            <div className="flex flex-col items-center min-w-[3.5rem]">
              <span
                className="text-3xl font-bold tabular-nums leading-none"
                style={{ color: "#01304D" }}
              >
                {String(n).padStart(2, "0")}
              </span>
              <span className="text-xs text-orange-600 uppercase tracking-wide mt-1">{s}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DetalheClient({ imovel, titulo, preco, endereco, mapaLabel }: Props) {
  const temMapa      = !!(imovel.lat && imovel.lng);
  const temHistorico = imovel.historicoPreco && imovel.historicoPreco.length >= 2;
  const temLeilao    = !!imovel.dataLeilao1Date;

  return (
    <>
      {/* Countdown até o leilão */}
      {temLeilao && <Countdown dateStr={imovel.dataLeilao1Date!} />}

      {/* Evolução do preço */}
      {temHistorico && (
        <div className="mb-6 bg-gray-50 rounded-xl p-4">
          <GraficoPreco historico={imovel.historicoPreco!} />
        </div>
      )}

      {/* Compartilhar + PDF + Favoritar */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-600 mb-2">Compartilhar imóvel</p>
        <div className="flex flex-wrap gap-2">
          <BotaoCompartilhar titulo={titulo} preco={preco} endereco={endereco} />
          <BotaoPDF imovel={imovel} />
          <BotaoFavorito imovel={imovel} variant="inline" />
        </div>
      </div>

      {/* Mapa */}
      {temMapa ? (
        <div>
          <h2 className="font-semibold text-gray-700 mb-3">Localização no mapa</h2>
          <MapaDetalhe lat={imovel.lat!} lng={imovel.lng!} label={mapaLabel} />
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">
          📍 Localização no mapa indisponível — endereço será geolocalizado em breve.
        </p>
      )}
    </>
  );
}
