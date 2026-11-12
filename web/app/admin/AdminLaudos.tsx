"use client";

import { useEffect, useState, useCallback } from "react";
import type { Laudo, LaudoStatus, BlocoStatus } from "@/lib/laudos-types";
import { STATUS_LABEL, BLOCO_LABEL } from "@/lib/laudos-types";

function statusBadge(s: LaudoStatus) {
  const cls: Record<LaudoStatus, string> = {
    aguardando_pagamento: "bg-yellow-100 text-yellow-800",
    pago:                 "bg-blue-100 text-blue-800",
    em_producao:          "bg-amber-100 text-amber-800",
    entregue:             "bg-green-100 text-green-800",
    cancelado:            "bg-gray-100 text-gray-500",
  };
  return cls[s] ?? "bg-gray-100 text-gray-500";
}

function blocoIcon(s: BlocoStatus) {
  return s === "concluido" ? "✅" : s === "em_andamento" ? "🔄" : "⏳";
}

const BLOCO_KEYS = ["mercado", "matricula", "juridica", "viabilidade"] as const;
type BlocoKey = (typeof BLOCO_KEYS)[number];

export default function AdminLaudos() {
  const [laudos, setLaudos] = useState<Laudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [localBlocos, setLocalBlocos] = useState<Laudo["blocos"] | null>(null);
  const [localStatus, setLocalStatus] = useState<LaudoStatus | "">("");
  const [localObs, setLocalObs] = useState("");

  const fetchLaudos = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/laudos?admin=1");
    const data = await r.json();
    setLaudos(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLaudos(); }, [fetchLaudos]);

  function openLaudo(laudo: Laudo) {
    setSelected(laudo._id!);
    setLocalBlocos(JSON.parse(JSON.stringify(laudo.blocos)));
    setLocalStatus(laudo.status);
    setLocalObs(laudo.observacoes ?? "");
  }

  function closeLaudo() {
    setSelected(null);
    setLocalBlocos(null);
    setLocalStatus("");
    setLocalObs("");
  }

  async function salvar() {
    if (!selected || !localBlocos) return;
    setSaving(true);
    await fetch(`/api/laudos/${selected}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocos: localBlocos,
        status: localStatus || undefined,
        observacoes: localObs || undefined,
      }),
    });
    setSaving(false);
    // Refresh list
    await fetchLaudos();
    // Update selected
    const updated = laudos.find((l) => l._id === selected);
    if (updated) {
      updated.blocos = localBlocos;
      if (localStatus) updated.status = localStatus as LaudoStatus;
    }
  }

  async function marcarEntregue() {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/laudos/${selected}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "entregue" }),
    });
    setLocalStatus("entregue");
    setSaving(false);
    await fetchLaudos();
  }

  const selectedLaudo = laudos.find((l) => l._id === selected);
  const todosBlocosOk = localBlocos
    ? BLOCO_KEYS.every((k) => localBlocos[k].status === "concluido")
    : false;

  if (loading)
    return <p className="text-gray-400 text-sm py-4">Carregando laudos...</p>;

  if (selected && localBlocos && selectedLaudo) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <button onClick={closeLaudo} className="text-xs text-gray-400 hover:text-gray-600 mb-1">
              ← Voltar à lista
            </button>
            <h3 className="font-bold text-gray-800">{selectedLaudo.imovelDescricao}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedLaudo.userEmail} · {selectedLaudo.nivel === 1 ? "Digital" : "+ Consulta"} ·{" "}
              {(selectedLaudo.preco / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap justify-end">
            <select
              value={localStatus}
              onChange={(e) => setLocalStatus(e.target.value as LaudoStatus)}
              className="text-xs border rounded-lg px-2 py-1.5"
            >
              {(Object.entries(STATUS_LABEL) as [LaudoStatus, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <a
              href={`/laudos/${selected}/pdf`}
              target="_blank"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              📄 Ver PDF
            </a>
          </div>
        </div>

        {/* Blocos */}
        <div className="space-y-4">
          {BLOCO_KEYS.map((key) => {
            const bloco = localBlocos[key];
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Bloco header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span>{blocoIcon(bloco.status)}</span>
                    <span className="font-semibold text-sm text-gray-800">{BLOCO_LABEL[key]}</span>
                  </div>
                  <div className="flex gap-2">
                    {(["pendente", "em_andamento", "concluido"] as BlocoStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          setLocalBlocos((prev) =>
                            prev
                              ? { ...prev, [key]: { ...prev[key], status: s } }
                              : prev
                          )
                        }
                        className={`text-xs px-2 py-1 rounded-full font-medium transition-all ${
                          bloco.status === s
                            ? s === "concluido"
                              ? "bg-green-500 text-white"
                              : s === "em_andamento"
                              ? "bg-amber-500 text-white"
                              : "bg-gray-400 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {s === "pendente" ? "Na fila" : s === "em_andamento" ? "Andando" : "✓ Pronto"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editor do bloco */}
                <div className="p-4">
                  <textarea
                    value={bloco.conteudo ?? ""}
                    onChange={(e) =>
                      setLocalBlocos((prev) =>
                        prev
                          ? { ...prev, [key]: { ...prev[key], conteudo: e.target.value } }
                          : prev
                      )
                    }
                    placeholder={`Escreva aqui a análise de ${BLOCO_LABEL[key].toLowerCase()}...`}
                    rows={8}
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Observações internas (não exibidas ao cliente)
          </label>
          <textarea
            value={localObs}
            onChange={(e) => setLocalObs(e.target.value)}
            placeholder="Notas sobre este laudo..."
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Ações */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={salvar}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: "#01304D" }}
          >
            {saving ? "Salvando..." : "💾 Salvar alterações"}
          </button>

          {todosBlocosOk && localStatus !== "entregue" && (
            <button
              onClick={marcarEntregue}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: "#059669" }}
            >
              ✅ Marcar como entregue
            </button>
          )}
        </div>
      </div>
    );
  }

  // Lista de laudos
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">
          Laudos ({laudos.length})
        </h3>
        <button onClick={fetchLaudos} className="text-xs text-gray-400 hover:text-gray-600">
          🔄 Atualizar
        </button>
      </div>

      {laudos.length === 0 && (
        <p className="text-gray-400 text-sm py-6 text-center">Nenhum laudo solicitado ainda.</p>
      )}

      {laudos.map((laudo) => {
        const blocosOk = BLOCO_KEYS.filter((k) => laudo.blocos[k].status === "concluido").length;
        return (
          <button
            key={laudo._id}
            onClick={() => openLaudo(laudo)}
            className="w-full text-left bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-800 truncate">
                  {laudo.imovelDescricao}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {laudo.userEmail}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge(laudo.status)}`}>
                  {STATUS_LABEL[laudo.status]}
                </span>
                <span className="text-xs text-gray-400">
                  {blocosOk}/4 blocos
                </span>
              </div>
            </div>

            {/* Progress bar dos blocos */}
            <div className="mt-3 flex gap-1">
              {BLOCO_KEYS.map((k) => (
                <div
                  key={k}
                  className="flex-1 h-1 rounded-full"
                  style={{
                    backgroundColor:
                      laudo.blocos[k].status === "concluido"
                        ? "#059669"
                        : laudo.blocos[k].status === "em_andamento"
                        ? "#F59E0B"
                        : "#E5E7EB",
                  }}
                />
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-2">
              {new Date(laudo.criadoEm).toLocaleDateString("pt-BR")} ·{" "}
              {laudo.nivel === 1 ? "Digital" : "+ Consulta"} ·{" "}
              {(laudo.preco / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </button>
        );
      })}
    </div>
  );
}
