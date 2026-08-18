"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

interface Props {
  imovelNumero: string;
  imovelDescricao?: string;
  imovelId?: string;
  defaultCreci?: string;
}

export default function AbrirProcessoBtn({ imovelNumero, imovelDescricao, imovelId, defaultCreci }: Props) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [creci, setCreci] = useState(defaultCreci ?? "");
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string; corretorNome?: string } | null>(null);

  async function submit() {
    if (!creci.trim() || !numeroProcesso.trim()) {
      setMsg({ type: "error", text: "Preencha o CRECI e o número do processo." });
      return;
    }
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/clube/processos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creci, numeroProcessoCaixa: numeroProcesso, imovelNumero, imovelDescricao, imovelId }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMsg({ type: "success", text: `Processo registrado! Assessor: ${data.corretorNome}` });
    } else {
      setMsg({ type: "error", text: data.error });
    }
  }

  if (status === "loading") return null;

  if (!session) {
    return (
      <div className="mb-6">
        <a
          href={`/login?callbackUrl=/imovel/${encodeURIComponent(imovelNumero)}`}
          className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-lg border transition-colors"
          style={{ borderColor: "#F59E0B", color: "#92400E", backgroundColor: "#FEF3C7" }}
        >
          Já comprei este imóvel? Registrar no Clube BLC →
        </a>
      </div>
    );
  }

  if (msg?.type === "success") {
    return (
      <div className="mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          {msg.text}{" "}
          <a href="/perfil" className="underline font-medium ml-1">
            Acompanhar no perfil →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-sm font-medium px-4 py-2 rounded-lg border transition-colors hover:text-white"
          style={{ borderColor: "#01304D", color: "#01304D" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#01304D"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = ""; }}
        >
          Já comprei este imóvel — registrar no Clube BLC
        </button>
      ) : (
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: "#01304D" }}>Registrar processo — Clube BLC</p>
            <button
              onClick={() => { setOpen(false); setMsg(null); }}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Imóvel: <span className="font-mono font-medium">{imovelNumero}</span>
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              CRECI do assessor parceiro BLC
            </label>
            <input
              value={creci}
              onChange={(e) => setCreci(e.target.value.toUpperCase())}
              placeholder="ex: 12345-F"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Número do processo na Caixa
            </label>
            <input
              value={numeroProcesso}
              onChange={(e) => setNumeroProcesso(e.target.value)}
              placeholder="ex: 12345678901234"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            />
          </div>
          {msg?.type === "error" && (
            <p className="text-xs text-red-600">{msg.text}</p>
          )}
          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: "#01304D" }}
          >
            {loading ? "Registrando..." : "Registrar processo"}
          </button>
        </div>
      )}
    </div>
  );
}
