"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Filtros from "@/components/Filtros";
import { Imovel } from "@/lib/types";

const MapaImoveis = dynamic(() => import("@/components/MapaImoveis"), { ssr: false });

function MapaContent() {
  const searchParams = useSearchParams();
  const [imoveis, setImoveis]     = useState<Imovel[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", "200");
    fetch(`/api/imoveis?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setImoveis(d.imoveis || []))
      .finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "#0C4A6E" }}>Mapa de Imóveis</p>
        <h1 className="text-2xl font-bold text-gray-800">Visualize os imóveis no mapa</h1>
        <p className="text-gray-500 text-sm mt-1">Use os filtros para refinar quais imóveis aparecem no mapa.</p>
      </div>

      <Suspense><Filtros /></Suspense>

      {loading ? (
        <div className="flex items-center justify-center h-80 text-gray-400">Carregando mapa...</div>
      ) : (
        <MapaImoveis imoveis={imoveis} />
      )}
    </div>
  );
}

export default function MapaPage() {
  return (
    <Suspense>
      <MapaContent />
    </Suspense>
  );
}
