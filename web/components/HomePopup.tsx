"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

const POPUP_KEY = "blc_popup_data";

const RECURSOS = [
  {
    icone: "♥",
    iconeCor: "#01304D",
    titulo: "Favoritos",
    badge: "já disponível",
    badgeCor: "#16a34a",
    badgeBg: "#dcfce7",
    descricao: "Salve os imóveis que te interessam e acompanhe de perto.",
  },
  {
    icone: "✉",
    iconeCor: "#3b82f6",
    titulo: "Alertas por e-mail",
    badge: "em breve",
    badgeCor: "#2563eb",
    badgeBg: "#dbeafe",
    descricao: "Seja o primeiro a saber quando novos imóveis da sua região aparecerem.",
  },
  {
    icone: "📊",
    iconeCor: "#01304D",
    titulo: "Planilha de Viabilidade",
    badge: "já disponível",
    badgeCor: "#16a34a",
    badgeBg: "#dcfce7",
    descricao: "Calcule o ROI, fluxo de caixa e potencial de retorno de qualquer imóvel. Salve e exporte em XLS.",
  },
  {
    icone: "★",
    iconeCor: "#01304D",
    titulo: "Clube BLC",
    badge: "em implantação",
    badgeCor: "#92400e",
    badgeBg: "#fef3c7",
    descricao: "Cashback de até 1% em imóveis adquiridos e acesso a assessores parceiros com condições especiais.",
  },
];

export default function HomePopup() {
  const { data: session, status } = useSession();
  const [visivel, setVisivel] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user) return; // usuário logado não vê o popup

    const agora = Date.now();
    const ultima = Number(localStorage.getItem(POPUP_KEY) ?? 0);
    if (agora - ultima < 4 * 60 * 60 * 1000) return;

    const t = setTimeout(() => {
      localStorage.setItem(POPUP_KEY, String(agora));
      setVisivel(true);
      // Pequeno delay para a animação de entrada
      setTimeout(() => setMontado(true), 10);
    }, 1800);

    return () => clearTimeout(t);
  }, [status, session]);

  function fechar() {
    setMontado(false);
    setTimeout(() => setVisivel(false), 250);
  }

  if (!visivel) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-250"
      style={{ backgroundColor: montado ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)", backdropFilter: "blur(2px)" }}
      onClick={fechar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden transition-all duration-250"
        style={{
          opacity: montado ? 1 : 0,
          transform: montado ? "scale(1) translateY(0)" : "scale(0.95) translateY(16px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra azul no topo */}
        <div style={{ backgroundColor: "#01304D", height: "4px" }} />

        {/* Botão fechar */}
        <button
          onClick={fechar}
          aria-label="Fechar"
          className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="4" y1="4" x2="20" y2="20" />
            <line x1="20" y1="4" x2="4" y2="20" />
          </svg>
        </button>

        <div className="px-6 pt-5 pb-6">
          {/* Título */}
          <h2 className="text-xl font-bold leading-snug mb-1 pr-6" style={{ color: "#01304D" }}>
            Sua busca de imóveis vai ficar ainda melhor
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Estamos adicionando recursos exclusivos para usuários cadastrados:
          </p>

          {/* Lista de recursos */}
          <div className="space-y-4 mb-5">
            {RECURSOS.map((r) => (
              <div key={r.titulo} className="flex gap-3 items-start">
                <span className="text-xl leading-none shrink-0 mt-0.5" style={{ color: r.iconeCor }}>
                  {r.icone}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                    {r.titulo}
                    <span
                      className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                      style={{ color: r.badgeCor, backgroundColor: r.badgeBg }}
                    >
                      {r.badge}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.descricao}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mb-4">
            O cadastro é <strong>completamente gratuito</strong> e leva menos de 1 minuto.
          </p>

          {/* CTAs */}
          <a
            href="/cadastro"
            className="flex items-center justify-center w-full py-3 rounded-xl font-bold text-sm mb-3 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#01304D", color: "#fff" }}
          >
            Criar conta grátis
          </a>
          <p className="text-center text-xs text-gray-400">
            Já tem conta?{" "}
            <a href="/login" className="font-medium hover:underline" style={{ color: "#01304D" }}>
              Entrar
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
