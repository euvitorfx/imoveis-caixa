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

function fmt(v: number) {
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function startOf(period: "day" | "week" | "month") {
  const d = new Date();
  if (period === "day") {
    d.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

function laudosPagosSince(laudos: Laudo[], since: Date) {
  return laudos.filter(
    (l) =>
      (l.status === "pago" || l.status === "em_producao" || l.status === "entregue") &&
      l.paidAt &&
      new Date(l.paidAt) >= since
  );
}

function FinanceiroTab({ laudos }: { laudos: Laudo[] }) {
  const pagos = laudos.filter((l) => l.status !== "aguardando_pagamento" && l.status !== "cancelado");
  const aguardando = laudos.filter((l) => l.status === "aguardando_pagamento");
  const entregues = laudos.filter((l) => l.status === "entregue");

  const receitaTotal = pagos.reduce((s, l) => s + l.preco, 0);

  const hoje = laudosPagosSince(laudos, startOf("day"));
  const semana = laudosPagosSince(laudos, startOf("week"));
  const mes = laudosPagosSince(laudos, startOf("month"));

  const cards = [
    { label: "Hoje", laudos: hoje, cor: "#01304D" },
    { label: "Esta semana", laudos: semana, cor: "#0369a1" },
    { label: "Este mês", laudos: mes, cor: "#7c3aed" },
  ];

  // Últimas vendas
  const ultimas = [...pagos]
    .filter((l) => l.paidAt)
    .sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6">

      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Receita total</p>
          <p className="text-2xl font-bold" style={{ color: "#01304D" }}>{fmt(receitaTotal)}</p>
          <p className="text-xs text-gray-400 mt-1">{pagos.length} laudo{pagos.length !== 1 ? "s" : ""} pago{pagos.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Ticket médio</p>
          <p className="text-2xl font-bold text-gray-800">
            {pagos.length ? fmt(Math.round(receitaTotal / pagos.length)) : "—"}
          </p>
          <p className="text-xs text-gray-400 mt-1">{entregues.length} entregue{entregues.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Períodos */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map(({ label, laudos: ls, cor }) => (
          <div key={label} className="bg-white rounded-xl border p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-xl font-bold" style={{ color: cor }}>
              {fmt(ls.reduce((s, l) => s + l.preco, 0))}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{ls.length} venda{ls.length !== 1 ? "s" : ""}</p>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="bg-white rounded-xl border p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Por status</p>
        <div className="space-y-2">
          {(Object.entries(STATUS_LABEL) as [LaudoStatus, string][]).map(([status, label]) => {
            const count = laudos.filter((l) => l.status === status).length;
            const receita = laudos.filter((l) => l.status === status).reduce((s, l) => s + l.preco, 0);
            if (count === 0) return null;
            return (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge(status)}`}>
                    {label}
                  </span>
                  <span className="text-xs text-gray-400">{count} pedido{count !== 1 ? "s" : ""}</span>
                </div>
                {receita > 0 && (
                  <span className="text-xs font-semibold text-gray-700">{fmt(receita)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Aguardando pagamento */}
      {aguardando.length > 0 && (
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
          <p className="text-xs font-semibold text-yellow-800 mb-2">
            ⏳ {aguardando.length} aguardando pagamento
          </p>
          {aguardando.map((l) => (
            <p key={l._id} className="text-xs text-yellow-700 truncate">
              · {l.imovelDescricao} — {l.userEmail}
            </p>
          ))}
        </div>
      )}

      {/* Últimas vendas */}
      {ultimas.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 border-b">
            Últimas vendas
          </p>
          <div className="divide-y">
            {ultimas.map((l) => (
              <div key={l._id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{l.imovelDescricao}</p>
                  <p className="text-xs text-gray-400">
                    {l.userEmail} · {l.paidAt ? new Date(l.paidAt).toLocaleDateString("pt-BR") : "—"}
                  </p>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-sm font-bold" style={{ color: "#01304D" }}>{fmt(l.preco)}</p>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${statusBadge(l.status)}`}>
                    {STATUS_LABEL[l.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type Evento = { _id: string; tipo: string; userId: string; userEmail: string; userName?: string; imovelId: string; nivel?: number; criadoEm: string };

function tempoDecorrido(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d atrás`;
  if (h >= 1) return `${h}h atrás`;
  return `${m}min atrás`;
}

function conv(a: number, b: number) {
  if (!b) return "—";
  return `${Math.round((a / b) * 100)}%`;
}

type Periodo = "hoje" | "ontem" | "7" | "15" | "30" | "90";

const PERIODO_LABELS: Record<Periodo, string> = {
  hoje: "Hoje", ontem: "Ontem", "7": "7d", "15": "15d", "30": "30d", "90": "90d",
};

function getPeriodoRange(p: Periodo): { desde: string; ate?: string; label: string } {
  const now = new Date();
  if (p === "hoje") {
    const inicio = new Date(now); inicio.setHours(0, 0, 0, 0);
    return { desde: inicio.toISOString(), label: "hoje" };
  }
  if (p === "ontem") {
    const inicio = new Date(now); inicio.setDate(inicio.getDate() - 1); inicio.setHours(0, 0, 0, 0);
    const fim = new Date(now); fim.setDate(fim.getDate() - 1); fim.setHours(23, 59, 59, 999);
    return { desde: inicio.toISOString(), ate: fim.toISOString(), label: "ontem" };
  }
  const dias = Number(p);
  return { desde: new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString(), label: `últimos ${dias} dias` };
}

function FunilTab({ laudos }: { laudos: Laudo[] }) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async (p: Periodo) => {
    setCarregando(true);
    const { desde, ate } = getPeriodoRange(p);
    const qs = ate ? `desde=${encodeURIComponent(desde)}&ate=${encodeURIComponent(ate)}` : `desde=${encodeURIComponent(desde)}`;
    const r = await fetch(`/api/laudos/evento?${qs}`);
    const data = await r.json();
    setEventos(Array.isArray(data) ? data : []);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(periodo); }, [periodo, carregar]);

  const visualizacoes = eventos.filter((e) => e.tipo === "visualizou_botao");
  const cliques = eventos.filter((e) => e.tipo === "clicou_plano");

  // Laudos criados no mesmo período
  const { desde, ate } = getPeriodoRange(periodo);
  const iniciados = laudos.filter((l) => l.criadoEm >= desde && (!ate || l.criadoEm <= ate));
  const pagos = iniciados.filter((l) => l.status !== "aguardando_pagamento" && l.status !== "cancelado");

  // Abandonados: aguardando pagamento há mais de 30 min
  const THRESHOLD = 30 * 60 * 1000;
  const abandonados = laudos
    .filter((l) => l.status === "aguardando_pagamento" && Date.now() - new Date(l.criadoEm).getTime() > THRESHOLD)
    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());

  // Usuários únicos por etapa
  const uniqViews = new Set(visualizacoes.map((e) => e.userId)).size;
  const uniqCliques = new Set(cliques.map((e) => e.userId)).size;
  const uniqIniciados = new Set(iniciados.map((l) => l.userId)).size;
  const uniqPagos = new Set(pagos.map((l) => l.userId)).size;

  return (
    <div className="space-y-5">
      {/* Período */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-gray-400 mr-1">Período:</span>
        {(["hoje", "ontem", "7", "15", "30", "90"] as Periodo[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              periodo === p ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
            style={periodo === p ? { backgroundColor: "#01304D" } : {}}
          >
            {PERIODO_LABELS[p]}
          </button>
        ))}
        {carregando && <span className="text-xs text-gray-400 ml-1">🔄</span>}
      </div>

      {/* Funil */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 border-b">
          Funil de conversão — {getPeriodoRange(periodo).label}
        </p>
        <div className="divide-y">
          {[
            { label: "Visualizaram o botão", n: uniqViews, cor: "#6366f1" },
            { label: "Clicaram em um plano", n: uniqCliques, cor: "#F59E0B", conv: conv(uniqCliques, uniqViews) },
            { label: "Iniciaram checkout", n: uniqIniciados, cor: "#3b82f6", conv: conv(uniqIniciados, uniqCliques) },
            { label: "Pagaram", n: uniqPagos, cor: "#059669", conv: conv(uniqPagos, uniqIniciados) },
          ].map(({ label, n, cor, conv: c }, i) => (
            <div key={i} className="flex items-center px-4 py-3 gap-3">
              <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: cor }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">{label}</p>
                {c && <p className="text-xs text-gray-400">conversão da etapa anterior: {c}</p>}
              </div>
              <p className="text-xl font-bold shrink-0" style={{ color: cor }}>{n}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Abandonados */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 border-b">
          ⚠️ Aguardando pagamento ({abandonados.length})
        </p>
        {abandonados.length === 0 ? (
          <p className="text-xs text-gray-400 px-4 py-4">Nenhum laudo pendente no momento.</p>
        ) : (
          <div className="divide-y">
            {abandonados.map((l) => {
              const fone = l.userPhone?.replace(/\D/g, "");
              const waLink = fone
                ? `https://wa.me/55${fone}?text=${encodeURIComponent(`Olá, ${l.userName}! Vi que você iniciou um pedido de Laudo BLC para o imóvel "${l.imovelDescricao}" e ficou no aguardo do pagamento. Posso te ajudar a concluir?`)}`
                : null;
              const emailLink = `mailto:${l.userEmail}?subject=${encodeURIComponent("Seu Laudo BLC está aguardando")}&body=${encodeURIComponent(`Olá, ${l.userName}!\n\nVimos que você iniciou um pedido de Laudo BLC para o imóvel "${l.imovelDescricao}" mas o pagamento ainda não foi confirmado.\n\nPosso te ajudar a concluir?\n\nAtt,\nEquipe BLC`)}`;
              return (
                <div key={l._id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{l.userName}</p>
                      <p className="text-xs text-gray-500">{l.userEmail}</p>
                      {l.userPhone && (
                        <p className="text-xs text-gray-500">{l.userPhone}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold" style={{ color: "#01304D" }}>
                        {l.nivel === 1 ? "R$97" : "R$297"}
                      </p>
                      <p className="text-xs text-gray-400">{tempoDecorrido(l.criadoEm)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{l.imovelDescricao}</p>
                  <div className="flex gap-2 pt-0.5">
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                        style={{ backgroundColor: "#25D366" }}
                      >
                        💬 WhatsApp
                      </a>
                    )}
                    <a
                      href={emailLink}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      ✉ E-mail
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Todos os eventos — lista detalhada por usuário */}
      {eventos.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 border-b">
            Atividade detalhada — {getPeriodoRange(periodo).label}
          </p>
          <div className="divide-y">
            {eventos.slice(0, 30).map((e) => (
              <div key={e._id} className="flex items-start justify-between px-4 py-3 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">
                    {e.userName || e.userEmail}
                  </p>
                  {e.userName && (
                    <p className="text-xs text-gray-400">{e.userEmail}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{e.imovelId}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full block ${
                    e.tipo === "clicou_plano"
                      ? e.nivel === 2 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {e.tipo === "clicou_plano"
                      ? `Clicou · ${e.nivel === 2 ? "R$297" : "R$97"}`
                      : "Visualizou"}
                  </span>
                  <p className="text-xs text-gray-400">{tempoDecorrido(e.criadoEm)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLaudos() {
  const [laudos, setLaudos] = useState<Laudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [view, setView] = useState<"financeiro" | "funil" | "lista">("financeiro");
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [localBlocos, setLocalBlocos] = useState<Laudo["blocos"] | null>(null);
  const [localStatus, setLocalStatus] = useState<LaudoStatus | "">("");
  const [localObs, setLocalObs] = useState("");

  const fetchLaudos = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const r = await fetch("/api/laudos?admin=1");
      const data = await r.json();
      if (!r.ok) {
        setErro(data.error ?? `Erro ${r.status}`);
        setLaudos([]);
      } else {
        setLaudos(Array.isArray(data) ? data : []);
      }
    } catch {
      setErro("Erro de rede ao buscar laudos");
    }
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
    await fetchLaudos();
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

  if (erro)
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        <p className="font-semibold mb-1">Erro ao carregar laudos</p>
        <p>{erro}</p>
        <button onClick={fetchLaudos} className="mt-2 text-xs underline">Tentar novamente</button>
      </div>
    );

  // Detalhe do laudo selecionado
  if (selected && localBlocos && selectedLaudo) {
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <button onClick={closeLaudo} className="text-xs text-gray-400 hover:text-gray-600 mb-1">
              ← Voltar
            </button>
            <h3 className="font-bold text-gray-800">{selectedLaudo.imovelDescricao}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedLaudo.userEmail} · {selectedLaudo.nivel === 1 ? "Digital" : "+ Consulta"} ·{" "}
              {fmt(selectedLaudo.preco)}
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

        <div className="space-y-4">
          {BLOCO_KEYS.map((key) => {
            const bloco = localBlocos[key];
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
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
                            prev ? { ...prev, [key]: { ...prev[key], status: s } } : prev
                          )
                        }
                        className={`text-xs px-2 py-1 rounded-full font-medium transition-all ${
                          bloco.status === s
                            ? s === "concluido" ? "bg-green-500 text-white"
                              : s === "em_andamento" ? "bg-amber-500 text-white"
                              : "bg-gray-400 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {s === "pendente" ? "Na fila" : s === "em_andamento" ? "Andando" : "✓ Pronto"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <textarea
                    value={bloco.conteudo ?? ""}
                    onChange={(e) =>
                      setLocalBlocos((prev) =>
                        prev ? { ...prev, [key]: { ...prev[key], conteudo: e.target.value } } : prev
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

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Observações internas
          </label>
          <textarea
            value={localObs}
            onChange={(e) => setLocalObs(e.target.value)}
            placeholder="Notas sobre este laudo..."
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={salvar}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: "#01304D" }}
          >
            {saving ? "Salvando..." : "💾 Salvar"}
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

  // Lista / financeiro
  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b">
        {(["financeiro", "funil", "lista"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg -mb-px border-b-2 transition-colors ${
              view === v
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {v === "financeiro" ? "📊 Financeiro" : v === "funil" ? "🔭 Funil" : `📋 Laudos (${laudos.length})`}
          </button>
        ))}
        <button onClick={fetchLaudos} className="ml-auto text-xs text-gray-400 hover:text-gray-600 px-2">
          🔄
        </button>
      </div>

      {view === "financeiro" && <FinanceiroTab laudos={laudos} />}

      {view === "funil" && <FunilTab laudos={laudos} />}

      {view === "lista" && (
        <div className="space-y-3">
          {laudos.length === 0 && (
            <p className="text-gray-400 text-sm py-6 text-center">Nenhum laudo ainda.</p>
          )}
          {laudos.map((laudo) => {
            const blocosOk = BLOCO_KEYS.filter((k) => laudo.blocos[k].status === "concluido").length;
            const num = laudo.numero ? `#${String(laudo.numero).padStart(4, "0")}` : `#${laudo._id!.slice(-8).toUpperCase()}`;
            return (
              <button
                key={laudo._id}
                onClick={() => openLaudo(laudo)}
                className="w-full text-left bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{laudo.imovelDescricao}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{laudo.userEmail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge(laudo.status)}`}>
                      {STATUS_LABEL[laudo.status]}
                    </span>
                    <span className="text-xs text-gray-400">{blocosOk}/4 blocos</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-1">
                  {BLOCO_KEYS.map((k) => (
                    <div
                      key={k}
                      className="flex-1 h-1 rounded-full"
                      style={{
                        backgroundColor:
                          laudo.blocos[k].status === "concluido" ? "#059669"
                          : laudo.blocos[k].status === "em_andamento" ? "#F59E0B"
                          : "#E5E7EB",
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  <span className="font-mono">{num}</span>
                  {" · "}{new Date(laudo.criadoEm).toLocaleDateString("pt-BR")} ·{" "}
                  {laudo.nivel === 1 ? "Digital" : "+ Consulta"} · {fmt(laudo.preco)}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
