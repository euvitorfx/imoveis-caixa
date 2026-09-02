"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Props {
  page: number;
  totalPages: number;
  total: number;
}

export default function Paginacao({ page, totalPages, total }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const pathname     = usePathname();

  const goTo = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 mt-8">
      <p className="text-sm text-gray-500">{total.toLocaleString("pt-BR")} imóveis encontrados</p>
      <div className="flex gap-1 flex-wrap justify-center">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-30 hover:bg-gray-100"
        >
          ← Anterior
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dot-${i}`} className="px-3 py-1.5 text-sm text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => goTo(p)}
              className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                p === page
                  ? "bg-blue-600 text-white border-blue-600"
                  : "hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-30 hover:bg-gray-100"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
}
