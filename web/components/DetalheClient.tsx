"use client";

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

export default function DetalheClient({ imovel, titulo, preco, endereco, mapaLabel }: Props) {
  const temMapa     = !!(imovel.lat && imovel.lng);
  const temHistorico = imovel.historicoPreco && imovel.historicoPreco.length >= 2;

  return (
    <>
      {/* Evolução do preço */}
      {temHistorico && (
        <div className="mb-6 bg-gray-50 rounded-xl p-4">
          <GraficoPreco historico={imovel.historicoPreco!} />
        </div>
      )}

      {/* Compartilhar + PDF */}
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
          <h2 className="font-semibold text-gray-700 mb-3">Localização</h2>
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
