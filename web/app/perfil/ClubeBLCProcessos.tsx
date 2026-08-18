"use client";

import { useEffect, useState } from "react";
import type { ProcessoClube } from "@/lib/processos-clube";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  aguardando_dados: { label: "Aguardando dados", color: "#D97706", bg: "#FEF3C7" },
  em_analise:       { label: "Em análise",        color: "#2563EB", bg: "#EFF6FF" },
  em_andamento:     { label: "Em andamento",      color: "#7C3AED", bg: "#F5F3FF" },
  concluido:        { label: "Concluído",          color: "#059669", bg: "#ECFDF5" },
  cancelado:        { label: "Cancelado",          color: "#6B7280", bg: "#F3F4F6" },
};

export default function ClubeBLCProcessos() {
  const [processos, setProcessos] = useState<ProcessoClube[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creci, setCreci] = useState("");
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [imovelNumero, setImovelNumero] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function fetchProcessos() {
    const res = await fetch("/api/clube/processos");
    if (res.ok) setProcessos(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchProcessos(); }, []);

  async function submit() {
    if (!creci.trim() || !numeroProcesso.trim()) {
      setFormMsg({ type: "error", text: "CRECI e número do processo são obrigatórios." });
      return;
    }
    setSubmitting(true);
    setFormMsg(null);
    const res = await fetch("/api/clube/processos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creci,
        numeroProcessoCaixa: numeroProcesso,
        imovelNumero: imovelNumero || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      setFormMsg({ type: "success", text: `Processo registrado! Assessor: ${data.corretorNome}` });
      setCreci(""); setNumeroProcesso(""); setImovelNumero("");
      fetchProcessos();
    } else {
      setFormMsg({ type: "error", text: data.error });
    }
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Meus processos BLC</h3>
        <button
          onClick={() => { setShowForm((v) => !v); setFormMsg(null); }}
          className="text-xs font-medium hover:underline"
          style={{ color: "#01304D" }}
        >
          {showForm ? "Cancelar" : "+ Nova arrematação"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-4 mb-4 space-y-3" style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}>
          <p className="text-xs font-semibold" style={{ color: "#01304D" }}>Registrar nova arrematação</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CRECI do assessor parceiro BLC</label>
            <input
              value={creci}
              onChange={(e) => setCreci(e.target.value.toUpperCase())}
              placeholder="ex: 12345-F"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Número do processo na Caixa</label>
            <input
              value={numeroProcesso}
              onChange={(e) => setNumeroProcesso(e.target.value)}
              placeholder="ex: 12345678901234"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nº do imóvel no BLC{" "}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              value={imovelNumero}
              onChange={(e) => setImovelNumero(e.target.value)}
              placeholder="ex: 23168000000"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {formMsg && (
            <p className={`text-xs font-medium ${formMsg.type === "error" ? "text-red-600" : "text-green-600"}`}>
              {formMsg.text}
            </p>
          )}
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: "#01304D" }}
          >
            {submitting ? "Registrando..." : "Registrar processo"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Carregando...</p>
      ) : processos.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-400">Nenhum processo registrado ainda.</p>
          <p className="text-xs text-gray-400 mt-1">
            Clique em &ldquo;+ Nova arrematação&rdquo; acima ou registre na página do imóvel.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {processos.map((p) => {
            const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.em_analise;
            return (
              <div key={p._id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    {p.imovelDescricao && (
                      <p className="text-sm font-medium text-gray-800 truncate">{p.imovelDescricao}</p>
                    )}
                    {p.imovelNumero && (
                      <p className="text-xs text-gray-500 font-mono">Imóvel: {p.imovelNumero}</p>
                    )}
                    <p className="text-xs text-gray-500">Processo Caixa: <span className="font-mono">{p.numeroProcessoCaixa}</span></p>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ color: cfg.color, backgroundColor: cfg.bg }}
                  >
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Registrado em {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
