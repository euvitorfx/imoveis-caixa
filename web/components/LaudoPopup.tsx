"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "laudo_popup_last_shown";
const COOLDOWN_MS = 8 * 60 * 60 * 1000;

export default function LaudoPopup({ imovelId }: { imovelId: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const last = localStorage.getItem(STORAGE_KEY);
      const shouldShow = !last || Date.now() - Number(last) > COOLDOWN_MS;
      if (shouldShow) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function fechar() {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={fechar}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header navy */}
        <div className="px-5 pt-5 pb-4 shrink-0" style={{ backgroundColor: "#01304D" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#F59E0B" }}>
                Novo serviço
              </p>
              <h2 className="text-white font-bold text-xl leading-tight mb-1">Laudo BLC</h2>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                Análise profissional antes de você arrematar
              </p>
            </div>
            <button
              onClick={fechar}
              className="text-white/40 hover:text-white text-xl leading-none mt-0.5 shrink-0"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body scrollável */}
        <div className="bg-white overflow-y-auto px-5 py-4 space-y-4">

          {/* 4 blocos */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              O que está incluído
            </p>
            <div className="space-y-2">
              {[
                {
                  icon: "📊",
                  titulo: "Análise de mercado",
                  desc: "Comparativo de preços na região e estimativa do valor real do imóvel",
                },
                {
                  icon: "📋",
                  titulo: "Análise da matrícula",
                  desc: "Verificação de ônus, pendências e histórico de proprietários",
                },
                {
                  icon: "⚖️",
                  titulo: "Análise jurídica",
                  desc: "Riscos legais, dívidas, execuções fiscais e situação do ocupante",
                },
                {
                  icon: "💰",
                  titulo: "Viabilidade financeira",
                  desc: "Simulação de ROI, custos estimados de posse e prazo de retorno",
                },
              ].map(({ icon, titulo, desc }) => (
                <div
                  key={titulo}
                  className="flex gap-3 items-start rounded-xl border border-gray-100 px-3 py-2.5"
                >
                  <span className="text-base shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{titulo}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Planos */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Escolha seu plano
            </p>
            <div className="space-y-2">

              {/* Digital */}
              <div className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Laudo digital</p>
                  <p className="text-xs text-gray-400 mt-0.5">Relatório completo em PDF</p>
                </div>
                <p className="text-lg font-bold shrink-0" style={{ color: "#01304D" }}>R$97</p>
              </div>

              {/* Digital + Consulta */}
              <div
                className="rounded-xl px-3 py-3"
                style={{ backgroundColor: "#FEF3C7", border: "1.5px solid #F59E0B" }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-bold" style={{ color: "#92400E" }}>
                        Digital + consulta ao vivo
                      </p>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#F59E0B", color: "#78350F" }}
                      >
                        Mais completo
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "#B45309" }}>
                      Tudo do digital, mais:
                    </p>
                  </div>
                  <p className="text-lg font-bold shrink-0" style={{ color: "#92400E" }}>R$297</p>
                </div>
                <ul className="space-y-1.5">
                  {[
                    "30 min ao vivo com Vítor Valença, especialista em leilões",
                    "Tire dúvidas específicas sobre este imóvel",
                    "Estratégia personalizada de lance e arrematação",
                    "Orientação no pós-arrematação",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs" style={{ color: "#92400E" }}>
                      <span className="shrink-0 mt-0.5" style={{ color: "#D97706" }}>✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>

          {/* CTAs */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={fechar}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              Depois
            </button>
            <a
              href={`/imovel/${imovelId}#solicitar-laudo`}
              onClick={fechar}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white text-center"
              style={{ backgroundColor: "#01304D" }}
            >
              Solicitar laudo →
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
