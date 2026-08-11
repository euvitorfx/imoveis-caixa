"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface FavoritosCtx {
  favoritos: string[];
  loading: boolean;
  toggleFavorito: (hdnImovel: string) => Promise<void>;
}

const FavoritosContext = createContext<FavoritosCtx>({
  favoritos: [],
  loading: false,
  toggleFavorito: async () => {},
});

export function FavoritosProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/favoritos")
        .then((r) => r.json())
        .then((d) => setFavoritos(d.favoritos ?? []));
    } else if (status === "unauthenticated") {
      setFavoritos([]);
    }
  }, [status]);

  const toggleFavorito = useCallback(
    async (hdnImovel: string) => {
      if (status === "unauthenticated") {
        router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (status !== "authenticated") return;

      setLoading(true);
      if (favoritos.includes(hdnImovel)) {
        setFavoritos((prev) => prev.filter((id) => id !== hdnImovel));
        await fetch(`/api/favoritos?id=${hdnImovel}`, { method: "DELETE" });
      } else {
        const plano = (session?.user as { plano?: string })?.plano ?? "gratuito";
        if (plano === "gratuito" && favoritos.length >= 10) {
          alert("Limite de 10 favoritos atingido no plano gratuito.");
          setLoading(false);
          return;
        }
        setFavoritos((prev) => [...prev, hdnImovel]);
        const res = await fetch("/api/favoritos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hdnImovel }),
        });
        if (!res.ok) {
          const data = await res.json();
          setFavoritos((prev) => prev.filter((id) => id !== hdnImovel));
          if (res.status === 403) alert(data.error ?? "Limite de favoritos atingido.");
        }
      }
      setLoading(false);
    },
    [favoritos, status, session, router]
  );

  return (
    <FavoritosContext.Provider value={{ favoritos, loading, toggleFavorito }}>
      {children}
    </FavoritosContext.Provider>
  );
}

export function useFavoritos() {
  return useContext(FavoritosContext);
}
