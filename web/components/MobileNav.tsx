"use client";

import { useState, useEffect } from "react";
import { SITE_NAME } from "@/lib/config";

const LINKS = [
  { href: "/", label: "Buscar" },
  { href: "/mapa", label: "Mapa" },
  { href: "/estatisticas", label: "Estatísticas" },
  { href: "/corretores", label: "Corretores" },
  { href: "/ferramentas", label: "Ferramentas" },
  { href: "/blog", label: "Blog" },
  { href: "/favoritos", label: "♥ Favoritos", color: "#F59E0B" },
];

export default function MobileNav({
  ultimaAtualizacao,
  navAuth,
}: {
  ultimaAtualizacao: React.ReactNode;
  navAuth: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="sm:hidden">
      {/* Topo: logo + botão hamburger */}
      <div className="flex items-center justify-between py-1">
        <a href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt={SITE_NAME}
            className="w-auto object-contain"
            style={{ height: "75px" }}
          />
        </a>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.85)" }}
          aria-label="Abrir menu"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Última atualização centralizada */}
      <div className="text-center pb-1">
        {ultimaAtualizacao}
      </div>

      {/* Overlay de menu */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ backgroundColor: "#01304D" }}
        >
          {/* Cabeçalho do overlay */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: "2px solid #F59E0B" }}
          >
            <a href="/" onClick={() => setOpen(false)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt={SITE_NAME}
                className="w-auto object-contain"
                style={{ height: "65px" }}
              />
            </a>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.85)" }}
              aria-label="Fechar menu"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="4" y1="4" x2="20" y2="20" />
                <line x1="20" y1="4" x2="4" y2="20" />
              </svg>
            </button>
          </div>

          {/* Auth (entrar / criar conta / perfil) */}
          <div
            className="px-5 py-4 shrink-0 flex flex-col gap-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}
          >
            {navAuth}
          </div>

          {/* Links de navegação */}
          <nav className="flex-1 overflow-y-auto py-2">
            {LINKS.map(({ href, label, color }) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center px-5 py-4 text-base font-medium transition-colors hover:bg-white/10"
                style={{ color: color ?? "rgba(255,255,255,0.85)" }}
              >
                {label}
              </a>
            ))}

            {/* Clube BLC em destaque */}
            <div className="px-5 pt-2 pb-4">
              <a
                href="/clube"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center py-3 rounded-xl text-base font-bold transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#F59E0B", color: "#1C1917" }}
              >
                Clube BLC
              </a>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
