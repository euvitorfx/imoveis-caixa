"use client";

import dynamic from "next/dynamic";
import BotaoCompartilhar from "@/components/BotaoCompartilhar";
import GraficoPreco from "@/components/GraficoPreco";

const MapaDetalhe = dynamic(() => import("@/components/MapaDetalhe"), { ssr: false });

interface Props {
  lat?: number;
  lng?: number;
  titulo: string;
  preco: string;
  endereco: string;
  mapaLabel: string;
  historicoPreco?: { data: string; preco: number }[];
}

export default function DetalheClient({ lat, lng, titulo, preco, endereco, mapaLabel, historicoPreco }: Props) {
  const temMapa = !!(lat && lng);
  const temHistorico = historicoPreco && historicoPreco.length >= 2;

  return (
    <>
      {/* Evolução do preço */}
      {temHistorico && (
        <div className="mb-6 bg-gray-50 rounded-xl p-4">
          <GraficoPreco historico={historicoPreco!} />
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-600 mb-1">Compartilhar imóvel</p>
        <BotaoCompartilhar titulo={titulo} preco={preco} endereco={endereco} />
      </div>

      {temMapa ? (
        <div>
          <h2 className="font-semibold text-gray-700 mb-3">Localização</h2>
          <MapaDetalhe lat={lat!} lng={lng!} label={mapaLabel} />
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">
          📍 Localização no mapa indisponível — endereço será geolocalizado em breve.
        </p>
      )}
    </>
  );
}
