"use client";

import { useState } from "react";

const NIGHT = "#01304D";
const AMBER = "#F59E0B";
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtN(n: number) { return n.toLocaleString("pt-BR"); }
function fmtM2(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) + "/m²";
}
function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

export interface EstadoStat {
  _id: string;
  total: number;
  precoMedio: number | null;
  precoMin: number | null;
  precoMax: number | null;
  descontoMedio: number | null;
}
export interface ItemStat { _id: string; total: number }
export interface M2Stat { _id: string; precoPorM2Medio: number; total: number }
export interface EvolucaoItem { _id: { ano: number; mes: number }; total: number }
export interface DestaqueStat {
  hdnImovel: string;
  preco: number;
  cidade: string;
  estado: string;
  tipo?: string;
  pctDesconto?: number;
  precoAval?: number;
}
export interface TopCidade { _id: { cidade: string; estado: string }; total: number }
export interface FaixaPreco {
  abaixo100k: number;
  de100k300k: number;
  de300k500k: number;
  de500k1M: number;
  acima1M: number;
}

export interface EstatisticasProps {
  total: number;
  porEstado: EstadoStat[];
  porTipo: ItemStat[];
  porModalidade: ItemStat[];
  comDesconto10: number;
  comDesconto20: number;
  comDesconto30: number;
  comDesconto40: number;
  comDesconto50: number;
  aceitaFinanciamento: number;
  maisBarato: DestaqueStat | null;
  maiorDesconto: DestaqueStat | null;
  precoPorM2PorEstado: M2Stat[];
  abaixo100k: number;
  novos30d: number;
  removidos30d: number;
  atualizados30d: number;
  evolucaoAcervo: EvolucaoItem[];
  pageviewsTotal: number;
  faixaPreco: FaixaPreco;
  topCidades: TopCidade[];
  visitas30d: number | null;
}

const TABS = [
  { id: "geral",  label: "Visão geral" },
  { id: "preco",  label: "Por preço",         isNew: true },
  { id: "local",  label: "Localização" },
  { id: "tipo",   label: "Tipo & Modalidade" },
  { id: "evo",    label: "Evolução" },
];

const FAIXAS: [keyof FaixaPreco, string, string][] = [
  ["abaixo100k", "< R$ 100k",    "#04342C"],
  ["de100k300k", "R$ 100k–300k", "#0F6E56"],
  ["de300k500k", "R$ 300k–500k", "#1D9E75"],
  ["de500k1M",   "R$ 500k–1M",   "#5DCAA5"],
  ["acima1M",    "> R$ 1M",      "#9FE1CB"],
];

const DESCONTOS: [number, number | undefined, string][] = [
  [10, undefined, AMBER],
  [20, undefined, "#d97706"],
  [30, undefined, "#ea580c"],
  [40, undefined, "#dc2626"],
  [50, undefined, "#991b1b"],
];

export default function EstatisticasUI(p: EstatisticasProps) {
  const [tab, setTab] = useState("geral");

  const maxEstado   = Math.max(...p.porEstado.map(e => e.total), 1);
  const maxM2       = Math.max(...p.precoPorM2PorEstado.map(e => e.precoPorM2Medio), 1);
  const maxEvolucao = Math.max(...p.evolucaoAcervo.map(e => e.total), 1);
  const maxCidade   = p.topCidades[0]?.total ?? 1;

  const faixaTotal =
    p.faixaPreco.abaixo100k + p.faixaPreco.de100k300k +
    p.faixaPreco.de300k500k + p.faixaPreco.de500k1M + p.faixaPreco.acima1M;

  const descontoCounts = [
    p.comDesconto10, p.comDesconto20, p.comDesconto30,
    p.comDesconto40, p.comDesconto50,
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: NIGHT }}>Dashboard</p>
        <h1 className="text-2xl font-bold text-gray-800">Estatísticas do acervo</h1>
        <p className="text-gray-500 text-sm mt-1">Panorama geral dos imóveis Caixa disponíveis no Brasil · atualizado a cada hora</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 flex-wrap mb-6 pb-3 border-b border-gray-100">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-sm px-4 py-1.5 rounded-full border transition-colors font-medium ${
              tab === t.id
                ? "text-white border-transparent"
                : "border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            style={tab === t.id ? { backgroundColor: NIGHT } : {}}
          >
            {t.label}
            {t.isNew && (
              <span className="ml-1.5 text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full align-middle">
                NOVO
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ===== VISÃO GERAL ===== */}
      {tab === "geral" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-3xl font-bold" style={{ color: NIGHT }}>{fmtN(p.total)}</p>
              <p className="text-xs text-gray-500 mt-1">Imóveis ativos</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{fmtN(p.aceitaFinanciamento)}</p>
              <p className="text-xs text-gray-500 mt-1">Aceitam financiamento</p>
              <span className="inline-block mt-1.5 text-[10px] font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                {pct(p.aceitaFinanciamento, p.total)}% do total
              </span>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-3xl font-bold text-orange-500">{fmtN(p.comDesconto30)}</p>
              <p className="text-xs text-gray-500 mt-1">Desconto &gt; 30%</p>
              <span className="inline-block mt-1.5 text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                {pct(p.comDesconto30, p.total)}% do total
              </span>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{fmtN(p.comDesconto50)}</p>
              <p className="text-xs text-gray-500 mt-1">Desconto &gt; 50%</p>
              <span className="inline-block mt-1.5 text-[10px] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                {pct(p.comDesconto50, p.total)}% do total
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{fmtN(p.abaixo100k)}</p>
              <p className="text-xs text-gray-500 mt-1">Abaixo de R$ 100k</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-3xl font-bold" style={{ color: NIGHT }}>{p.porEstado.length}</p>
              <p className="text-xs text-gray-500 mt-1">Estados cobertos</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-3xl font-bold text-indigo-600">{fmtN(p.pageviewsTotal)}</p>
              <p className="text-xs text-gray-500 mt-1">Total de páginas carregadas</p>
            </div>
          </div>

          <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-2">Destaques do acervo</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {p.maisBarato && (
              <a href={`/imovel/${p.maisBarato.hdnImovel}`}
                className="bg-white rounded-xl shadow hover:shadow-md transition-shadow p-5 flex flex-col gap-1 border-l-4 border-green-500">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Imóvel mais barato</p>
                <p className="text-2xl font-bold text-gray-800">{fmt(p.maisBarato.preco)}</p>
                <p className="text-sm text-gray-500 truncate">
                  {p.maisBarato.tipo || "Imóvel"} · {p.maisBarato.cidade}/{p.maisBarato.estado}
                </p>
                <p className="text-xs text-green-600 mt-1">Ver imóvel →</p>
              </a>
            )}
            {p.maiorDesconto && (
              <a href={`/imovel/${p.maiorDesconto.hdnImovel}`}
                className="bg-white rounded-xl shadow hover:shadow-md transition-shadow p-5 flex flex-col gap-1 border-l-4 border-orange-500">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Maior desconto ativo</p>
                <p className="text-2xl font-bold text-gray-800">
                  -{Math.round(p.maiorDesconto.pctDesconto ?? 0)}%
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {fmt(p.maiorDesconto.preco)} · {p.maiorDesconto.cidade}/{p.maiorDesconto.estado}
                </p>
                <p className="text-xs text-orange-600 mt-1">Ver imóvel →</p>
              </a>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-700">Movimentações do acervo</h2>
                <p className="text-xs text-gray-400 mt-0.5">Últimos 30 dias</p>
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-100 px-3 py-1 rounded-full">
                30 dias
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                <p className="text-2xl font-bold text-green-600">+{fmtN(p.novos30d)}</p>
                <p className="text-xs text-green-700 font-medium mt-1">Novos imóveis</p>
                <p className="text-xs text-gray-400 mt-0.5">adicionados</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-2xl font-bold text-red-500">-{fmtN(p.removidos30d)}</p>
                <p className="text-xs text-red-700 font-medium mt-1">Removidos</p>
                <p className="text-xs text-gray-400 mt-0.5">vendidos ou retirados</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-2xl font-bold text-blue-500">{fmtN(p.atualizados30d)}</p>
                <p className="text-xs text-blue-700 font-medium mt-1">Atualizados</p>
                <p className="text-xs text-gray-400 mt-0.5">preço ou dados</p>
              </div>
            </div>
          </div>

          {p.visitas30d !== null && (
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-3xl font-bold text-indigo-500">{fmtN(p.visitas30d)}</p>
              <p className="text-xs text-gray-500 mt-1">Visitas ao site (últimos 30 dias)</p>
            </div>
          )}
        </>
      )}

      {/* ===== POR PREÇO ===== */}
      {tab === "preco" && (
        <>
          <div className="bg-white rounded-xl shadow p-5 mb-6" style={{ borderTop: `3px solid ${NIGHT}` }}>
            <h2 className="font-semibold text-gray-700 mb-1">Distribuição por faixa de preço</h2>
            <p className="text-xs text-gray-400 mb-4">
              Imóveis ativos com preço informado, agrupados por faixa de valor de venda
            </p>
            <div className="flex h-9 rounded-lg overflow-hidden mb-4">
              {faixaTotal > 0 && FAIXAS.map(([key, , color]) => {
                const n = p.faixaPreco[key];
                const w = pct(n, faixaTotal);
                if (w === 0) return null;
                return (
                  <div
                    key={key}
                    style={{ flex: w, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {w >= 8 && (
                      <span className="text-[10px] font-bold" style={{ color: w >= 15 ? "#fff" : "#04342C" }}>
                        {w}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {FAIXAS.map(([key, label, color]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
                  <span>{label}</span>
                  <span className="font-semibold text-gray-700">{fmtN(p.faixaPreco[key])}</span>
                  <span className="text-gray-400">({pct(p.faixaPreco[key], faixaTotal)}%)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5" style={{ borderTop: `3px solid ${AMBER}` }}>
            <h2 className="font-semibold text-gray-700 mb-1">Funil de desconto sobre avaliação</h2>
            <p className="text-xs text-gray-400 mb-5">
              Quantos imóveis superam cada patamar de desconto em relação ao preço de avaliação
            </p>
            <div className="space-y-3">
              {DESCONTOS.map(([thr, , barColor], i) => {
                const count = descontoCounts[i];
                return (
                  <div key={thr} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-400 w-10 text-right shrink-0">
                      &gt;{thr}%
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct(count, p.total)}%`, background: barColor }}
                      />
                    </div>
                    <span className="text-sm font-bold w-10 text-right shrink-0" style={{ color: barColor }}>
                      {pct(count, p.total)}%
                    </span>
                    <span className="text-xs text-gray-400 w-24 text-right shrink-0">
                      {fmtN(count)} imóveis
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ===== LOCALIZAÇÃO ===== */}
      {tab === "local" && (
        <>
          {p.topCidades.length > 0 && (
            <div className="bg-white rounded-xl shadow p-5 mb-6" style={{ borderTop: `3px solid ${AMBER}` }}>
              <h2 className="font-semibold text-gray-700 mb-1">Top 10 cidades com mais imóveis</h2>
              <p className="text-xs text-gray-400 mb-4">Municípios com maior concentração no acervo</p>
              <div className="space-y-2">
                {p.topCidades.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-xs font-bold text-gray-300 w-5 text-right shrink-0">{i + 1}</span>
                    <span className="w-44 text-gray-700 truncate shrink-0">
                      {c._id.cidade}{" "}
                      <span className="text-gray-400">· {c._id.estado}</span>
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.round((c.total / maxCidade) * 100)}%`, background: AMBER }}
                      />
                    </div>
                    <span className="w-12 text-right font-semibold text-gray-700 shrink-0">{fmtN(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {p.precoPorM2PorEstado.length > 0 && (
            <div className="bg-white rounded-xl shadow p-5 mb-6">
              <h2 className="font-semibold text-gray-700 mb-1">Preço médio por m² por estado</h2>
              <p className="text-xs text-gray-400 mb-4">
                Imóveis com área ≥ 15 m² e preço/m² entre R$ 100 e R$ 50.000. A quantidade pode diferir do total por estado.
              </p>
              <div className="space-y-2">
                {p.precoPorM2PorEstado.map((e) => (
                  <div key={e._id} className="flex items-center gap-2 text-sm">
                    <a href={`/imoveis/${e._id.toLowerCase()}`}
                      className="w-8 font-semibold hover:underline shrink-0" style={{ color: NIGHT }}>
                      {e._id}
                    </a>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full"
                        style={{ width: `${Math.round((e.precoPorM2Medio / maxM2) * 100)}%`, backgroundColor: NIGHT }} />
                    </div>
                    <span className="w-28 text-right font-medium text-gray-700 shrink-0">
                      {fmtM2(e.precoPorM2Medio)}
                    </span>
                    <span className="text-xs text-gray-400 w-16 text-right shrink-0">
                      {fmtN(e.total)} imóv.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Quantidade e preços por estado</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b">
                    <th className="pb-2 font-medium">Estado</th>
                    <th className="pb-2 font-medium text-right">Qtd</th>
                    <th className="pb-2 font-medium text-right">Preço médio</th>
                    <th className="pb-2 font-medium text-right">Desc. médio</th>
                    <th className="pb-2 font-medium text-right">Mín</th>
                    <th className="pb-2 pl-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {p.porEstado.map((e) => (
                    <tr key={e._id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 font-semibold">
                        <a href={`/imoveis/${e._id.toLowerCase()}`}
                          className="hover:underline" style={{ color: NIGHT }}>
                          {e._id}
                        </a>
                      </td>
                      <td className="py-2 text-right">{fmtN(e.total)}</td>
                      <td className="py-2 text-right">{fmt(e.precoMedio)}</td>
                      <td className="py-2 text-right font-medium text-orange-500">
                        {e.descontoMedio != null ? `${Math.round(e.descontoMedio)}%` : "—"}
                      </td>
                      <td className="py-2 text-right text-green-600">{fmt(e.precoMin)}</td>
                      <td className="py-2 pl-4 w-32">
                        <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="h-2 rounded-full"
                            style={{ width: `${Math.round((e.total / maxEstado) * 100)}%`, backgroundColor: NIGHT }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===== TIPO & MODALIDADE ===== */}
      {tab === "tipo" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Por tipo de imóvel</h2>
            <div className="space-y-2">
              {p.porTipo.map((t) => (
                <div key={t._id} className="flex items-center gap-2 text-sm">
                  <span className="w-40 truncate text-gray-600">{t._id || "—"}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-2 rounded-full"
                      style={{ width: `${Math.round((t.total / p.total) * 100)}%`, backgroundColor: NIGHT }} />
                  </div>
                  <span className="w-12 text-right font-medium text-gray-700">{fmtN(t.total)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Por modalidade de venda</h2>
            <div className="space-y-2">
              {p.porModalidade.map((m) => (
                <div key={m._id} className="flex items-center gap-2 text-sm">
                  <span className="w-40 truncate text-gray-600">{m._id || "—"}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.round((m.total / p.total) * 100)}%` }} />
                  </div>
                  <span className="w-12 text-right font-medium text-gray-700">{fmtN(m.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== EVOLUÇÃO ===== */}
      {tab === "evo" && (
        <>
          {p.evolucaoAcervo.length > 0 && (
            <div className="bg-white rounded-xl shadow p-5 mb-6">
              <h2 className="font-semibold text-gray-700 mb-1">Evolução do acervo</h2>
              <p className="text-xs text-gray-400 mb-4">
                Imóveis adicionados por mês desde o início da coleta.
              </p>
              <div className="flex items-end gap-1.5 h-40">
                {p.evolucaoAcervo.map((item) => {
                  const h = Math.round((item.total / maxEvolucao) * 100);
                  const label = `${MESES[item._id.mes - 1]}/${String(item._id.ano).slice(2)}`;
                  return (
                    <div key={`${item._id.ano}-${item._id.mes}`}
                      className="flex flex-col items-center gap-1 flex-1 min-w-0">
                      <span className="text-xs text-gray-500 font-medium">{fmtN(item.total)}</span>
                      <div className="w-full rounded-t transition-all"
                        style={{ height: `${Math.max(h, 4)}%`, minHeight: "4px", backgroundColor: NIGHT }} />
                      <span className="text-xs text-gray-400 truncate w-full text-center">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {p.visitas30d !== null && (
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-3xl font-bold text-indigo-500">{fmtN(p.visitas30d)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Visitas ao site (últimos 30 dias · Vercel Analytics)
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
