"use client";

import { useSearchParams } from "next/navigation";

const VOLTA_RE = /^\/imoveis\/[a-z]{2}(\/[a-z0-9-]+)?$/;

export default function VoltaLink() {
  const sp = useSearchParams();
  const raw = sp.get("volta") ?? "";
  if (!VOLTA_RE.test(raw)) return null;

  return (
    <a
      href={raw}
      className="inline-flex items-center gap-1.5 mb-3 text-sm font-medium px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
    >
      ← Imóveis novos na sua região
    </a>
  );
}
