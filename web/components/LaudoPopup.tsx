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
        className="w-full rounded-2xl overflow-hidden shadow-2xl"
        style={{ maxWidth: 460 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header navy */}
        <div className="px-6 pt-5 pb-4" style={{ backgroundColor: "#01304D" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#F59E0B" }}>
                Novo serviço
              </p>
              <h2 className="text-white font-bold text-xl leading-tight mb-1">Laudo BLC</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
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

        {/* Body */}
        <div className="bg-white px-6 py-5 space-y-4">

          {/* 4 blocos em grid 2×2 */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              O que está incluído
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: "📊", titulo: "Mercado", desc: "Comparativo de preços e valor real do imóvel" },
                { icon: "📋", titulo: "Matrícula", desc: "Ônus, pendências e histórico de proprietários" },
                { icon: "⚖️", titulo: "Jurídica", desc: "Riscos legais, dívidas e situação do ocupante" },
                { icon: "💰", titulo: "Viabilidade", desc: "ROI, custos estimados e prazo de retorno" },
              ].map(({ icon, titulo, desc }) => (
                <div key={titulo} className="rounded-xl border border-gray-100 p-3">
                  <p className="text-sm font-semibold text-gray-800 mb-1">{icon} {titulo}</p>
                  <p className="text-xs text-gray-500 leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Planos lado a lado */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Escolha seu plano
            </p>
            <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1.5fr" }}>

              {/* Digital */}
              <div className="rounded-xl border border-gray-100 p-3 flex flex-col justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Laudo digital</p>
                  <p className="text-xs text-gray-400 mb-3">Relatório completo em PDF</p>
                </div>
                <p className="text-xl font-bold" style={{ color: "#01304D" }}>R$97</p>
              </div>

              {/* Digital + Consulta */}
              <div className="rounded-xl p-3" style={{ backgroundColor: "#FEF3C7", border: "1.5px solid #F59E0B" }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-1"
                      style={{ backgroundColor: "#F59E0B", color: "#78350F" }}
                    >
                      Mais completo
                    </span>
                    <p className="text-sm font-bold leading-tight" style={{ color: "#92400E" }}>
                      Digital + consulta ao vivo
                    </p>
                  </div>
                  <p className="text-xl font-bold shrink-0" style={{ color: "#92400E" }}>R$297</p>
                </div>
                <ul className="space-y-1">
                  {[
                    "30 min ao vivo com especialista",
                    "Dúvidas sobre este imóvel",
                    "Estratégia de lance",
                    "Orientação pós-arrematação",
                  ].map((item) => (
                    <li key={item} className="flex gap-1.5 text-xs" style={{ color: "#92400E" }}>
                      <span className="shrink-0" style={{ color: "#D97706" }}>✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>

          {/* CTAs */}
          <div className="flex gap-2">
            <button
              onClick={fechar}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 shrink-0"
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
