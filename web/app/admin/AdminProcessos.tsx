"use client";

import { useEffect, useState } from "react";
import type { ProcessoClubeEnriquecido } from "@/lib/processos-clube";

const STATUS_LABELS: Record<string, string> = {
  aguardando_dados: "Aguardando dados",
  em_analise:       "Em análise",
  em_andamento:     "Em andamento",
  concluido:        "Concluído",
  cancelado:        "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  aguardando_dados: "text-amber-700 bg-amber-50",
  em_analise:       "text-blue-700 bg-blue-50",
  em_andamento:     "text-purple-700 bg-purple-50",
  concluido:        "text-green-700 bg-green-50",
  cancelado:        "text-gray-500 bg-gray-100",
};

export default function AdminProcessos() {
  const [processos, setProcessos] = useState<ProcessoClubeEnriquecido[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/processos");
    if (res.ok) setProcessos(await res.json());
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch(`/api/admin/processos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(null);
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Processos Clube BLC
        </h2>
        <span className="text-xs text-gray-400">{processos.length} total</span>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-10">Carregando...</p>
      ) : processos.length === 0 ? (
        <p className="text-gray-400 text-center py-10">Nenhum processo registrado ainda.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Comprador</th>
                <th className="px-4 py-3 font-medium">Assessor</th>
                <th className="px-4 py-3 font-medium">Imóvel</th>
                <th className="px-4 py-3 font-medium">Processo Caixa</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {processos.map((p) => (
                <tr key={p._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{p.compradorNome ?? "—"}</p>
                    {p.compradorEmail && (
                      <p className="text-xs text-gray-400 truncate max-w-[160px]">{p.compradorEmail}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{p.corretorNome ?? "—"}</p>
                    {p.corretorCreci && (
                      <p className="text-xs text-gray-400">CRECI: {p.corretorCreci}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    {p.imovelDescricao && (
                      <p className="text-xs text-gray-700 font-medium truncate">{p.imovelDescricao}</p>
                    )}
                    {p.imovelNumero && (
                      <p className="text-xs font-mono text-gray-400">{p.imovelNumero}</p>
                    )}
                    {!p.imovelDescricao && !p.imovelNumero && (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {p.numeroProcessoCaixa}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.status}
                      disabled={updating === p._id}
                      onChange={(e) => updateStatus(p._id, e.target.value)}
                      className={`text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 font-medium ${STATUS_COLORS[p.status] ?? ""}`}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
