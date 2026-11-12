"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "laudo_popup_last_shown";
const COOLDOWN_MS = 8 * 60 * 60 * 1000; // 8 horas

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
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header navy */}
        <div className="px-5 pt-5 pb-4" style={{ backgroundColor: "#01304D" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: "#F59E0B" }}
              >
                Novo serviço
              </p>
              <h2 className="text-white font-bold text-xl leading-tight">
                Laudo BLC
              </h2>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                Análise profissional deste imóvel feita pelo nosso time
              </p>
            </div>
            <button
              onClick={fechar}
              className="text-white/50 hover:text-white text-xl leading-none mt-0.5 shrink-0"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="bg-white px-5 py-4 space-y-3">
          <p className="text-sm text-gray-600">
            Antes de arrematar, peça um laudo completo com 4 análises:
          </p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "📊", label: "Mercado" },
              { icon: "📋", label: "Matrícula" },
              { icon: "⚖️", label: "Jurídica" },
              { icon: "💰", label: "Viabilidade" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ backgroundColor: "#F0F4F7" }}
              >
                <span className="text-base">{icon}</span>
                <span className="text-xs font-semibold text-gray-700">{label}</span>
              </div>
            ))}
          </div>

          {/* Planos */}
          <div className="space-y-2 pt-1">
            <div className="rounded-xl border border-gray-100 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-800">Laudo Digital</p>
                <p className="text-xs text-gray-400">Análise escrita + PDF</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: "#01304D" }}>R$97</p>
              </div>
            </div>
            <div
              className="rounded-xl p-3 flex items-center justify-between"
              style={{ backgroundColor: "#FEF3C7", border: "1px solid #F59E0B" }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: "#92400E" }}>
                  Digital + Consulta
                </p>
                <p className="text-xs" style={{ color: "#B45309" }}>
                  + 30 min com especialista
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: "#92400E" }}>R$297</p>
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
