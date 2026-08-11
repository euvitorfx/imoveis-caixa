"use client";

import { useEffect, useRef } from "react";
import { Imovel } from "@/lib/types";

interface Props {
  imoveis: Imovel[];
}

function fmt(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function MapaImoveis({ imoveis }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapObj      = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerGroup  = useRef<any>(null);

  // Inicializa o mapa uma única vez
  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current || mapObj.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      let map;
      try {
        map = L.map(mapRef.current).setView([-15.78, -47.93], 5);
      } catch {
        return;
      }
      mapObj.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      layerGroup.current = L.layerGroup().addTo(map);
    }).catch(() => {});

    return () => {
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
        layerGroup.current = null;
      }
    };
  }, []);

  // Atualiza marcadores sempre que imoveis mudar
  useEffect(() => {
    if (!mapObj.current || !layerGroup.current) return;

    import("leaflet").then((L) => {
      layerGroup.current.clearLayers();

      const withCoords = imoveis.filter((im) => im.lat && im.lng);
      withCoords.forEach((im) => {
        L.marker([im.lat!, im.lng!])
          .addTo(layerGroup.current)
          .bindPopup(`
            <div style="min-width:160px">
              <strong>${fmt(im.preco)}</strong><br/>
              ${im.tipo || "Imóvel"} — ${im.cidade}/${im.estado}<br/>
              <a href="/imovel/${im.hdnImovel}" target="_blank" style="color:#2563eb">Ver detalhes →</a>
            </div>
          `);
      });

      if (withCoords.length > 0) {
        const bounds = L.latLngBounds(withCoords.map((im) => [im.lat!, im.lng!]));
        mapObj.current.fitBounds(bounds, { padding: [30, 30] });
      }
    });
  }, [imoveis]);

  // CSS do Leaflet
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const count = imoveis.filter((im) => im.lat && im.lng).length;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">{count} imóveis com localização no mapa</p>
      <div ref={mapRef} className="w-full rounded-xl overflow-hidden shadow" style={{ height: "520px" }} />
    </div>
  );
}
