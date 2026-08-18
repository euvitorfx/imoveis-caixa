"use client";

import { useEffect, useState, useMemo } from "react";

type Parceiro = { nome: string; creci: string; status: string } | null;

type Cidade = {
  uf: string;
  cidade: string;
  qtdImoveis: number;
  coberta: boolean;
  parceiro: Parceiro;
};

type Resumo = {
  totalParceiros: number;
  parceirosPorStatus: Record<string, number>;
  totalCidades: number;
  cidadesCobertas: number;
  cidadesDisponiveis: number;
  coberturaPct: number;
  totalImoveis: number;
};

const STATUS_LABEL: Record<string, string> = {
  sem_resposta:       "Sem resposta",
  em_negociacao:      "Em negociação",
  aguardando_retorno: "Aguardando retorno",
  parceiro_fechado:   "Parceiro fechado",
  recusou:            "Recusou",
};

const ESTADOS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color ?? "#1F2937" }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminCobertura() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [ufFiltro, setUfFiltro] = useState("todas");
  const [cobertura, setCobertura] = useState<"todas" | "coberta" | "disponivel">("todas");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    fetch("/api/admin/cobertura")
      .then((r) => r.json())
      .then((data) => {
        setResumo(data.resumo);
        setCidades(data.cidades);
        setLoading(false);
      });
  }, []);

  const filtradas = useMemo(() => {
    return cidades.filter((c) => {
      if (ufFiltro !== "todas" && c.uf !== ufFiltro) return false;
      if (cobertura === "coberta" && !c.coberta) return false;
      if (cobertura === "disponivel" && c.coberta) return false;
      if (busca && !c.cidade.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [cidades, ufFiltro, cobertura, busca]);

  if (loading) return <p className="text-gray-400 text-center py-16">Carregando dados da base Caixa...</p>;

  return (
    <div className="space-y-6">

      {/* ── RESUMO ─────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Resumo geral</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <StatCard label="Total de imóveis (Base Caixa)" value={resumo!.totalImoveis.toLocaleString("pt-BR")} />
          <StatCard label="Cidades com imóveis" value={resumo!.totalCidades.toLocaleString("pt-BR")} />
          <StatCard
            label="Cidades cobertas"
            value={resumo!.cidadesCobertas}
            sub={`${(resumo!.coberturaPct * 100).toFixed(1)}% de cobertura`}
            color="#059669"
          />
          <StatCard
            label="Cidades disponíveis"
            value={resumo!.cidadesDisponiveis}
            sub="Sem parceiro BLC"
            color="#6B7280"
          />
        </div>

        {/* Parceiros por status */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Total parceiros" value={resumo!.totalParceiros} />
          {Object.entries(STATUS_LABEL).map(([key, label]) => (
            <StatCard
              key={key}
              label={label}
              value={resumo!.parceirosPorStatus[key] ?? 0}
              color={key === "parceiro_fechado" ? "#059669" : key === "em_negociacao" ? "#2563EB" : undefined}
            />
          ))}
        </div>
      </div>

      {/* ── BARRA DE COBERTURA ─────────────────────────────── */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Cobertura de cidades</p>
          <p className="text-sm font-bold text-green-600">{(resumo!.coberturaPct * 100).toFixed(1)}%</p>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-3 rounded-full transition-all"
            style={{ width: `${resumo!.coberturaPct * 100}%`, backgroundColor: "#059669" }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{resumo!.cidadesCobertas} cobertas</span>
          <span>{resumo!.cidadesDisponiveis} disponíveis</span>
        </div>
      </div>

      {/* ── BASE CAIXA — TABELA ────────────────────────────── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Base Caixa — Cidades</h2>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cidade..."
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
          <select
            value={ufFiltro}
            onChange={(e) => setUfFiltro(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Todos os estados</option>
            {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
          <div className="flex gap-1">
            {(["todas", "coberta", "disponivel"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setCobertura(v)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  cobertura === v
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }`}
              >
                {v === "todas" ? `Todas (${cidades.length})` : v === "coberta" ? `Cobertas (${resumo!.cidadesCobertas})` : `Disponíveis (${resumo!.cidadesDisponiveis})`}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 self-center ml-auto">
            {filtradas.length} cidade{filtradas.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="bg-white rounded-xl shadow overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">UF</th>
                <th className="px-4 py-3 font-medium">Cidade</th>
                <th className="px-4 py-3 font-medium text-right">Imóveis</th>
                <th className="px-4 py-3 font-medium">Cobertura</th>
                <th className="px-4 py-3 font-medium">Parceiro BLC</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => (
                <tr
                  key={`${c.uf}-${c.cidade}`}
                  className={`border-b last:border-0 ${c.coberta ? "bg-green-50/40" : "hover:bg-gray-50"}`}
                >
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded font-medium">{c.uf}</span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{c.cidade}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{c.qtdImoveis}</td>
                  <td className="px-4 py-2.5">
                    {c.coberta ? (
                      <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Coberta</span>
                    ) : (
                      <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Disponível</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {c.parceiro ? (
                      <div>
                        <p className="text-xs font-medium text-gray-700">{c.parceiro.nome}</p>
                        <p className="text-xs text-gray-400">CRECI: {c.parceiro.creci} · {STATUS_LABEL[c.parceiro.status] ?? c.parceiro.status}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
