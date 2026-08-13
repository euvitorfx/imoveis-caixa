"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const SESSION_KEY = "blc_features_popup_seen";

const RECURSOS_ATIVOS = [
  {
    icone: "♥",
    iconeCor: "#01304D",
    iconeBg: "#e8eef3",
    titulo: "Favoritos",
    descricao: "Salve imóveis e acompanhe de perto. Acesse sua lista quando quiser.",
    href: "/favoritos",
  },
  {
    icone: "⊞",
    iconeCor: "#01304D",
    iconeBg: "#e8eef3",
    titulo: "Planilha de Viabilidade",
    descricao: "Calcule ROI, simule financiamento e exporte sua análise em XLS.",
    href: "/ferramentas/viabilidade",
  },
  {
    icone: "↓",
    iconeCor: "#01304D",
    iconeBg: "#e8eef3",
    titulo: "Exportar PDF do imóvel",
    descricao: "Baixe a ficha completa com fotos e descrição de qualquer imóvel.",
    href: null,
  },
];

const RECURSOS_BREVE = [
  {
    icone: "✉",
    iconeCor: "#2563eb",
    iconeBg: "#dbeafe",
    titulo: "Alertas por e-mail",
    descricao: "Seja o primeiro a saber quando novos imóveis da sua região aparecerem.",
  },
  {
    icone: "★",
    iconeCor: "#92400e",
    iconeBg: "#fef3c7",
    titulo: "Clube BLC",
    descricao: "Cashback de até 1% na compra do seu imóvel e acesso a assessores parceiros.",
  },
];

export default function PopupFeaturesUsuario() {
  const { data: session, status } = useSession();
  const [visivel, setVisivel] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) return;
    if (session.user.popupFeaturesVisto) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const t = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, "1");
      setVisivel(true);
      setTimeout(() => setMontado(true), 10);
    }, 2500);

    return () => clearTimeout(t);
  }, [status, session]);

  function fechar() {
    setMontado(false);
    setTimeout(() => setVisivel(false), 250);
  }

  async function naoMostrarNovamente() {
    fechar();
    await fetch("/api/user/popup-features-visto", { method: "POST" });
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
          <h2 className="text-lg font-bold leading-snug mb-1 pr-6" style={{ color: "#01304D" }}>
            O que você pode usar agora na sua conta
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Recursos ativos para você aproveitar hoje:
          </p>

          {/* Recursos já disponíveis */}
          <div className="space-y-4 mb-4">
            {RECURSOS_ATIVOS.map((r) => (
              <div key={r.titulo} className="flex gap-3 items-start">
                <span
                  className="text-lg leading-none shrink-0 mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ color: r.iconeCor, backgroundColor: r.iconeBg }}
                >
                  {r.icone}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                    {r.titulo}
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                      já disponível
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.descricao}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Divisor */}
          <div className="border-t border-dashed border-gray-200 my-4" />

          {/* Recursos em breve */}
          <div className="space-y-4 mb-5">
            {RECURSOS_BREVE.map((r) => (
              <div key={r.titulo} className="flex gap-3 items-start opacity-70">
                <span
                  className="text-lg leading-none shrink-0 mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ color: r.iconeCor, backgroundColor: r.iconeBg }}
                >
                  {r.icone}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                    {r.titulo}
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      em breve
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.descricao}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <button
            onClick={naoMostrarNovamente}
            className="flex items-center justify-center w-full py-3 rounded-xl font-bold text-sm mb-3 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#01304D", color: "#fff" }}
          >
            Entendi, obrigado!
          </button>
          <p className="text-center text-xs text-gray-400">
            <button
              onClick={naoMostrarNovamente}
              className="hover:underline hover:text-gray-500 transition-colors"
            >
              Não mostrar novamente
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
