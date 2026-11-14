"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Props {
  imovelId: string;
  imovelDescricao: string;
}

function getAnonId(): string {
  try {
    let id = localStorage.getItem("blc_anon");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("blc_anon", id); }
    return id;
  } catch { return "anon"; }
}

function logEvento(tipo: string, imovelId: string, nivel?: number, anonId?: string) {
  const payload = JSON.stringify({ tipo, imovelId, nivel, anonId });
  // sendBeacon garante entrega mesmo quando a página está sendo descarregada (clique em link)
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/laudos/evento", new Blob([payload], { type: "application/json" }));
  } else {
    fetch("/api/laudos/evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }).catch(() => {});
  }
}

export default function SolicitarLaudoBtn({ imovelId, imovelDescricao }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Registra visualização uma vez por sessão por imóvel (logado ou não)
  useEffect(() => {
    if (status === "loading") return;
    try {
      const key = `lv_${imovelId}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      const anonId = session ? undefined : getAnonId();
      logEvento("visualizou_botao", imovelId, undefined, anonId);
    } catch {}
  }, [status, session, imovelId]);

  if (status === "loading") return null;

  if (!session) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ border: "1.5px solid #F59E0B" }}>
        <div className="px-4 py-3" style={{ backgroundColor: "#FEF3C7" }}>
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <div>
              <p className="font-bold text-sm" style={{ color: "#01304D" }}>Laudo BLC</p>
              <p className="text-xs" style={{ color: "#92400E" }}>
                Análise profissional deste imóvel antes de arrematar
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white px-4 py-3">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3">
            {[
              { icon: "📊", text: "Valor de mercado real" },
              { icon: "📋", text: "Ônus e pendências" },
              { icon: "⚖️", text: "Riscos jurídicos" },
              { icon: "💰", text: "ROI e viabilidade" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
          <a
            href={`/login?callbackUrl=/imovel/${encodeURIComponent(imovelId)}`}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-bold"
            style={{ backgroundColor: "#F59E0B", color: "#01304D" }}
            onClick={() => logEvento("clicou_plano", imovelId, undefined, getAnonId())}
          >
            <span>Solicitar análise</span>
            <span>a partir de R$97 →</span>
          </a>
        </div>
      </div>
    );
  }

  async function handleClick(nivel: 1 | 2) {
    setLoading(true);
    logEvento("clicou_plano", imovelId, nivel);
    try {
      const res = await fetch("/api/laudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imovelId, nivel }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        router.push(`/laudos/checkout/${data.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1.5px solid #F59E0B" }}>
      {/* Header */}
      <div className="px-4 py-3" style={{ backgroundColor: "#FEF3C7" }}>
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <div>
            <p className="font-bold text-sm" style={{ color: "#01304D" }}>Laudo BLC</p>
            <p className="text-xs" style={{ color: "#92400E" }}>
              Análise completa: mercado · matrícula · jurídica · viabilidade
            </p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="bg-white p-3 flex flex-col gap-2">
        <button
          onClick={() => handleClick(1)}
          disabled={loading}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold border transition-all hover:shadow-sm disabled:opacity-50"
          style={{ borderColor: "#01304D", color: "#01304D" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#01304D";
            (e.currentTarget as HTMLButtonElement).style.color = "white";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
            (e.currentTarget as HTMLButtonElement).style.color = "#01304D";
          }}
        >
          <div className="flex flex-col items-start">
            <span>Laudo Digital</span>
            <span className="text-xs font-normal opacity-60">PDF completo em até 2 dias úteis</span>
          </div>
          <span className="font-bold shrink-0">R$ 97</span>
        </button>

        <button
          onClick={() => handleClick(2)}
          disabled={loading}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#F59E0B", color: "#01304D" }}
        >
          <div className="flex flex-col items-start">
            <span>Laudo + Consulta com Especialista</span>
            <span className="text-xs font-normal opacity-80">30min de call ao vivo · WhatsApp</span>
          </div>
          <span className="font-bold ml-2 shrink-0">R$ 297</span>
        </button>

        {loading && (
          <p className="text-center text-xs" style={{ color: "#4A6070" }}>
            Preparando checkout...
          </p>
        )}
      </div>
    </div>
  );
}
