"use client";

import { useEffect, useRef } from "react";

interface Props {
  lat: number;
  lng: number;
  label: string;
}

export default function MapaDetalhe({ lat, lng, label }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapObj = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current || mapObj.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((mapRef.current as any)._leaflet_id != null) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      let map;
      try {
        map = L.map(mapRef.current).setView([lat, lng], 15);
      } catch {
        return;
      }
      mapObj.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      L.marker([lat, lng]).addTo(map).bindPopup(label).openPopup();
    }).catch(() => {});

    return () => {
      if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; }
    };
  }, [lat, lng, label]);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  return (
    <div ref={mapRef} className="w-full rounded-xl overflow-hidden shadow" style={{ height: "300px" }} />
  );
}
