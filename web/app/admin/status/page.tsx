"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
interface WorkflowRun {
  id: number;
  name: string;
  workflow_id: number;
  path: string;
  head_branch: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | "skipped" | "timed_out" | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  event: string;
}

interface Deployment {
  uid: string;
  name: string;
  url: string;
  state: "BUILDING" | "ERROR" | "READY" | "CANCELED" | "QUEUED" | "INITIALIZING";
  createdAt: number;
  creator?: { username?: string };
  meta?: {
    githubCommitMessage?: string;
    githubCommitRef?: string;
    githubCommitSha?: string;
  };
}

interface StatusData {
  workflows: WorkflowRun[];
  deployments: Deployment[];
}

interface RoadmapItem {
  _id: string;
  theme: string;
  themeColor: string;
  themeOrder: number;
  title: string;
  priority: string;
  originalPriority: string;
  desc: string;
  chips: string[];
  dep: string;
  order: number;
}

interface RoadmapTheme {
  theme: string;
  color: string;
  themeOrder: number;
  items: RoadmapItem[];
}

interface SprintDoc {
  _id: string;
  num: string;
  title: string;
  items: string[];
  order: number;
}

type Tab = "panorama" | "live" | "sprints" | "roadmap";
type RoadmapFilter = "Pendentes" | "Alta" | "Média" | "Baixa" | "Feito";

// ── Helpers ────────────────────────────────────────────────────────────────
const REFRESH = 120;

function timeAgo(iso: string | number): string {
  const ts = typeof iso === "number" ? iso : Date.parse(iso);
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s atrás`;
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
  if (s < 86400) return `${Math.floor(s / 3600)}h atrás`;
  return `${Math.floor(s / 86400)}d atrás`;
}

function eventLabel(e: string) {
  return ({ schedule: "Agendado", workflow_dispatch: "Manual", push: "Push", pull_request: "PR" })[e] ?? e;
}

// ── Badge components ───────────────────────────────────────────────────────
function WorkflowBadge({ run }: { run: WorkflowRun }) {
  if (run.status !== "completed")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
        {run.status === "queued" ? "Na fila" : "Executando"}
      </span>
    );
  if (run.conclusion === "success")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Sucesso
      </span>
    );
  if (run.conclusion === "failure" || run.conclusion === "timed_out")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        {run.conclusion === "timed_out" ? "Timeout" : "Falhou"}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />{run.conclusion ?? run.status}
    </span>
  );
}

function DeployBadge({ state }: { state: Deployment["state"] }) {
  if (state === "BUILDING" || state === "INITIALIZING" || state === "QUEUED")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
        {state === "QUEUED" ? "Na fila" : "Building"}
      </span>
    );
  if (state === "READY")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Online
      </span>
    );
  if (state === "ERROR")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Erro
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />{state}
    </span>
  );
}

function PriorityChip({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    Alta: "bg-amber-100 text-amber-800 border-amber-200",
    Média: "bg-blue-100 text-blue-800 border-blue-200",
    Baixa: "bg-gray-100 text-gray-600 border-gray-200",
    Feito: "bg-green-100 text-green-800 border-green-200",
    Clube: "bg-violet-100 text-violet-800 border-violet-200",
    Pendente: "bg-orange-100 text-orange-800 border-orange-200",
    Auto: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${map[priority] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
      {priority}
    </span>
  );
}

// ── Sprint form modal ──────────────────────────────────────────────────────
function SprintFormModal({ nextNum, onClose, onSaved }: { nextNum: string; onClose: () => void; onSaved: (sprint: SprintDoc) => void }) {
  const [num, setNum] = useState(nextNum);
  const [title, setTitle] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    const items = itemsText.split("\n").map((l) => l.trim()).filter(Boolean);
    try {
      const res = await fetch("/api/admin/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ num, title, items }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao salvar");
      const { id } = await res.json();
      onSaved({ _id: id, num, title, items, order: parseInt(num, 10) });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-bold text-gray-800 mb-4">Adicionar Sprint</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="w-24">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Número</label>
              <input value={num} onChange={(e) => setNum(e.target.value)} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Título</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required
                placeholder="Nome da sprint"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Itens entregues (um por linha)</label>
            <textarea value={itemsText} onChange={(e) => setItemsText(e.target.value)} required
              rows={6} placeholder={"Feature A\nFeature B\nBug fix C"}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 text-sm bg-[#01304D] text-white rounded-lg hover:bg-[#01304D]/90 transition-colors disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar Sprint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function StatusPage() {
  const [tab, setTab] = useState<Tab>("panorama");
  const [roadmapFilter, setRoadmapFilter] = useState<RoadmapFilter>("Pendentes");

  // Live CI/CD state
  const [live, setLive] = useState<StatusData | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH);
  const [paused, setPaused] = useState(false);

  // Roadmap/Sprints state (from MongoDB)
  const [themes, setThemes] = useState<RoadmapTheme[]>([]);
  const [sprints, setSprints] = useState<SprintDoc[]>([]);
  const [roadmapLoading, setRoadmapLoading] = useState(true);
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Fetch CI/CD data ─────────────────────────────────────────────────────
  const fetchLive = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    try {
      const res = await fetch("/api/admin/status");
      if (!res.ok) { setLiveError("Não autorizado ou erro na API."); return; }
      setLive(await res.json());
      setLastUpdate(new Date());
      setCountdown(REFRESH);
      setLiveError("");
    } catch {
      setLiveError("Falha ao carregar status.");
    } finally {
      setLiveLoading(false);
    }
  }, []);

  // ── Fetch roadmap from MongoDB ────────────────────────────────────────────
  const fetchRoadmap = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roadmap");
      if (!res.ok) return;
      const data = await res.json();
      setThemes(data.themes ?? []);
      setSprints((data.sprints ?? []).sort((a: SprintDoc, b: SprintDoc) => a.order - b.order));
    } catch {
      // silently fail — page still shows
    } finally {
      setRoadmapLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();
    fetchRoadmap();
    const iv = setInterval(fetchLive, REFRESH * 1000);
    return () => clearInterval(iv);
  }, [fetchLive, fetchRoadmap]);

  useEffect(() => {
    function onVisibility() {
      const hidden = document.visibilityState === "hidden";
      setPaused(hidden);
      if (!hidden) fetchLive();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchLive]);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState !== "hidden") setCountdown((c) => (c <= 1 ? REFRESH : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Toggle item priority ──────────────────────────────────────────────────
  async function toggleItem(item: RoadmapItem) {
    const newPriority = item.priority === "Feito" ? (item.originalPriority ?? "Média") : "Feito";
    setTogglingId(item._id);

    // Optimistic update
    setThemes((prev) =>
      prev.map((t) => ({
        ...t,
        items: t.items.map((i) => (i._id === item._id ? { ...i, priority: newPriority } : i)),
      }))
    );

    try {
      const res = await fetch(`/api/admin/roadmap/items/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (!res.ok) throw new Error("Falha");
    } catch {
      // Revert on failure
      setThemes((prev) =>
        prev.map((t) => ({
          ...t,
          items: t.items.map((i) => (i._id === item._id ? { ...i, priority: item.priority } : i)),
        }))
      );
    } finally {
      setTogglingId(null);
    }
  }

  // ── Computed stats ────────────────────────────────────────────────────────
  const allItems = themes.flatMap((t) => t.items);
  const feitoCount = allItems.filter((i) => i.priority === "Feito").length;
  const pendingCount = allItems.filter((i) => !["Feito", "Auto"].includes(i.priority)).length;
  const altaCount = allItems.filter((i) => i.priority === "Alta").length;
  const sprintItemCount = sprints.reduce((a, s) => a + s.items.length, 0);

  const latestWorkflows = live?.workflows
    ? Object.values(
        live.workflows.reduce<Record<string, WorkflowRun>>((acc, run) => {
          if (!acc[run.name] || Date.parse(run.updated_at) > Date.parse(acc[run.name].updated_at)) acc[run.name] = run;
          return acc;
        }, {})
      ).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    : [];

  const latestDeploy = live?.deployments?.[0];
  const hasLiveError =
    latestWorkflows.some((r) => r.conclusion === "failure" || r.conclusion === "timed_out") ||
    latestDeploy?.state === "ERROR";

  const nextSprintCandidates = themes.flatMap((t) =>
    t.items.filter((i) => i.priority === "Alta").map((i) => ({ ...i, themeColor: t.color }))
  );

  const filteredRoadmap = themes
    .map((t) => ({
      ...t,
      items: t.items.filter((item) => {
        if (roadmapFilter === "Pendentes") return !["Feito", "Auto"].includes(item.priority);
        if (roadmapFilter === "Feito") return item.priority === "Feito";
        return item.priority === roadmapFilter;
      }),
    }))
    .filter((t) => t.items.length > 0);

  const nextSprintNum = sprints.length > 0 ? String(Math.max(...sprints.map((s) => parseInt(s.num, 10))) + 1) : "14";

  const tabs: { id: Tab; label: string; badge?: string }[] = [
    { id: "panorama", label: "Panorama" },
    { id: "live", label: "Ao Vivo", badge: hasLiveError ? "!" : undefined },
    { id: "sprints", label: `Sprints (${sprints.length})` },
    { id: "roadmap", label: "Roadmap" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
              <a href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</a>
              <span className="text-gray-200">|</span>
              <div>
                <span className="text-xs font-bold text-amber-600 tracking-widest uppercase">BLC</span>
                <span className="text-sm font-semibold text-gray-800 ml-2">Dashboard do Projeto</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdate && (
                <span className="text-xs text-gray-400 hidden sm:block">
                  {paused ? "pausado" : `atualiza em ${countdown}s`}
                </span>
              )}
              <button onClick={() => { fetchLive(); fetchRoadmap(); }}
                className="text-xs px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                ↺ Atualizar
              </button>
            </div>
          </div>

          <div className="flex gap-1 -mb-px">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id ? "border-amber-500 text-amber-700" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                {t.label}
                {t.badge && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {liveError && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{liveError}</div>
        )}

        {/* ═══════════ PANORAMA ═══════════ */}
        {tab === "panorama" && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { num: String(sprints.length), label: "Sprints concluídas", sub: `${sprintItemCount} funcionalidades entregues`, color: "#01304D" },
                { num: String(feitoCount + sprintItemCount), label: "Features em produção", sub: `Inclui ${feitoCount} adicionadas pós-sprint`, color: "#10B981" },
                { num: String(altaCount), label: "Alta prioridade", sub: "No roadmap pendente", color: "#F59E0B" },
                { num: String(pendingCount), label: "Itens no roadmap", sub: "Planejados para sprints futuros", color: "#6366F1" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl shadow-sm border p-4" style={{ borderLeftColor: s.color, borderLeftWidth: 4 }}>
                  <div className="text-2xl font-extrabold text-gray-800 font-mono tabular-nums">
                    {roadmapLoading ? <span className="inline-block w-8 h-7 bg-gray-100 rounded animate-pulse" /> : s.num}
                  </div>
                  <div className="text-xs font-semibold text-gray-700 mt-0.5">{s.label}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <span className="text-amber-500 text-lg shrink-0 mt-0.5">⚠</span>
              <div>
                <p className="text-sm font-semibold text-amber-900">Fluid CPU — Monitoramento ativo até set/2026</p>
                <p className="text-xs text-amber-700 mt-1">
                  Em ago/2026 o plano free atingiu 100% do limite (4h/mês). Correções aplicadas em 18–19/08/2026:
                  sitemap revalidate <strong>1h → 24h</strong> (principal) e polling de status <strong>30s → 120s</strong> (secundário).
                  Aguardar confirmação de redução no painel Vercel.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Live health */}
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Saúde dos Serviços</h2>
                  <button onClick={() => setTab("live")} className="text-xs text-blue-600 hover:underline">ver tudo →</button>
                </div>
                {liveLoading ? (
                  <div className="h-20 flex items-center justify-center text-sm text-gray-400">Carregando...</div>
                ) : (
                  <div className="space-y-2">
                    {latestDeploy && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <p className="text-xs font-semibold text-gray-700">Vercel — Último deploy</p>
                          <p className="text-[11px] text-gray-400 truncate max-w-[220px]">
                            {latestDeploy.meta?.githubCommitMessage?.split("\n")[0] ?? latestDeploy.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-gray-400">{timeAgo(latestDeploy.createdAt)}</span>
                          <DeployBadge state={latestDeploy.state} />
                        </div>
                      </div>
                    )}
                    {latestWorkflows.map((run) => (
                      <div key={run.workflow_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-xs font-semibold text-gray-700">{run.name}</p>
                          <p className="text-[11px] text-gray-400">{eventLabel(run.event)} · {timeAgo(run.updated_at)}</p>
                        </div>
                        <a href={run.html_url} target="_blank" rel="noopener noreferrer">
                          <WorkflowBadge run={run} />
                        </a>
                      </div>
                    ))}
                    {!latestDeploy && latestWorkflows.length === 0 && (
                      <p className="text-sm text-gray-400">Nenhum dado disponível</p>
                    )}
                  </div>
                )}
              </div>

              {/* Next sprint candidates */}
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Sprint {nextSprintNum} — Candidatos</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">Itens de alta prioridade no roadmap</p>
                  </div>
                  <button onClick={() => { setTab("roadmap"); setRoadmapFilter("Alta"); }} className="text-xs text-blue-600 hover:underline">ver roadmap →</button>
                </div>
                {roadmapLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nextSprintCandidates.slice(0, 6).map((item) => (
                      <div key={item._id} className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
                        <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: item.themeColor }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 leading-tight">{item.title}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{item.theme}</p>
                        </div>
                      </div>
                    ))}
                    {nextSprintCandidates.length > 6 && (
                      <p className="text-[11px] text-gray-400 pt-1">+ {nextSprintCandidates.length - 6} outros itens Alta</p>
                    )}
                    {nextSprintCandidates.length === 0 && (
                      <p className="text-sm text-gray-400">Nenhum item de alta prioridade pendente.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Last sprint */}
            {sprints.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Última Sprint Concluída</h2>
                    <p className="text-xs font-semibold text-gray-500 mt-0.5">
                      Sprint {sprints[sprints.length - 1].num} — {sprints[sprints.length - 1].title}
                    </p>
                  </div>
                  <button onClick={() => setTab("sprints")} className="text-xs text-blue-600 hover:underline">ver todas →</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sprints[sprints.length - 1].items.map((item) => (
                    <span key={item} className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2.5 py-1">
                      ✓ {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Theme progress */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Progresso por Tema</h2>
                <button onClick={() => setTab("roadmap")} className="text-xs text-blue-600 hover:underline">ver roadmap →</button>
              </div>
              {roadmapLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...Array(8)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {themes.filter((t) => t.theme !== "Dados — Automático").map((t) => {
                    const done = t.items.filter((i) => i.priority === "Feito").length;
                    const total = t.items.length;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <div key={t.theme} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: t.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600 truncate">{t.theme}</span>
                            <span className="text-[11px] text-gray-400 tabular-nums shrink-0 ml-2">{done}/{total}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: t.color }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ AO VIVO ═══════════ */}
        {tab === "live" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub Actions — ao vivo
                <div className="flex-1 h-px bg-gray-200 ml-2" />
              </h2>
              {liveLoading ? (
                <div className="bg-white rounded-xl shadow-sm border h-24 flex items-center justify-center text-sm text-gray-400">Carregando...</div>
              ) : !live?.workflows.length ? (
                <div className="bg-white rounded-xl shadow-sm border h-24 flex items-center justify-center text-sm text-gray-400">Nenhum workflow encontrado.</div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide bg-gray-50">
                          <th className="px-4 py-3 font-medium">Workflow</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Gatilho</th>
                          <th className="px-4 py-3 font-medium">Branch</th>
                          <th className="px-4 py-3 font-medium">Executado</th>
                          <th className="px-4 py-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {live.workflows.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)).map((run) => (
                          <tr key={run.id}
                            className={`border-b last:border-0 ${
                              run.conclusion === "failure" || run.conclusion === "timed_out" ? "bg-red-50"
                              : run.status !== "completed" ? "bg-yellow-50"
                              : "hover:bg-gray-50"
                            }`}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-800">{run.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{run.path.replace(".github/workflows/", "")}</p>
                            </td>
                            <td className="px-4 py-3"><WorkflowBadge run={run} /></td>
                            <td className="px-4 py-3 text-xs text-gray-500">{eventLabel(run.event)}</td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-600">{run.head_branch}</td>
                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{timeAgo(run.updated_at)}</td>
                            <td className="px-4 py-3 text-right">
                              <a href={run.html_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Ver →</a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 22.525H0l12-21.05 12 21.05z" /></svg>
                Vercel Deployments — ao vivo
                <div className="flex-1 h-px bg-gray-200 ml-2" />
              </h2>
              {liveLoading ? (
                <div className="bg-white rounded-xl shadow-sm border h-24 flex items-center justify-center text-sm text-gray-400">Carregando...</div>
              ) : !live?.deployments.length ? (
                <div className="bg-white rounded-xl shadow-sm border h-24 flex items-center justify-center text-sm text-gray-400">Nenhum deploy encontrado.</div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide bg-gray-50">
                          <th className="px-4 py-3 font-medium">Commit</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Branch</th>
                          <th className="px-4 py-3 font-medium">Autor</th>
                          <th className="px-4 py-3 font-medium">Quando</th>
                          <th className="px-4 py-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {live.deployments.map((dep) => (
                          <tr key={dep.uid}
                            className={`border-b last:border-0 ${
                              dep.state === "ERROR" ? "bg-red-50"
                              : dep.state === "BUILDING" || dep.state === "INITIALIZING" ? "bg-yellow-50"
                              : "hover:bg-gray-50"
                            }`}>
                            <td className="px-4 py-3 max-w-xs">
                              <p className="font-medium text-gray-800 truncate">
                                {dep.meta?.githubCommitMessage?.split("\n")[0] ?? dep.name}
                              </p>
                              {dep.meta?.githubCommitSha && (
                                <p className="text-xs font-mono text-gray-400 mt-0.5">{dep.meta.githubCommitSha.slice(0, 7)}</p>
                              )}
                            </td>
                            <td className="px-4 py-3"><DeployBadge state={dep.state} /></td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-600">{dep.meta?.githubCommitRef ?? "—"}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{dep.creator?.username ?? "—"}</td>
                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{timeAgo(dep.createdAt)}</td>
                            <td className="px-4 py-3 text-right">
                              {dep.state === "READY" && dep.url && (
                                <a href={`https://${dep.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Ver →</a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {lastUpdate && (
              <p className="text-xs text-gray-400 text-center">
                Atualizado às {lastUpdate.toLocaleTimeString("pt-BR")} ·{" "}
                {paused ? "pausado (aba em segundo plano)" : `próximo em ${countdown}s`}
              </p>
            )}
          </div>
        )}

        {/* ═══════════ SPRINTS ═══════════ */}
        {tab === "sprints" && (
          <div>
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{sprints.length} Sprints Concluídas</h2>
                <p className="text-sm text-gray-500">{sprintItemCount} funcionalidades entregues em produção</p>
              </div>
              <button onClick={() => setShowSprintForm(true)}
                className="flex items-center gap-2 text-sm px-4 py-2 bg-[#01304D] text-white rounded-lg hover:bg-[#01304D]/90 transition-colors">
                + Nova Sprint
              </button>
            </div>

            {/* Progress bar */}
            <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">Progresso geral</span>
                <span className="text-xs text-gray-500">Sprint {sprints.length} de ~16 estimadas</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#01304D] to-[#F59E0B] rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round((sprints.length / 16) * 100))}%` }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[11px] text-green-600 font-semibold">✓ Sprint 1</span>
                <span className="text-[11px] text-amber-600 font-semibold">→ Sprint {nextSprintNum}</span>
                <span className="text-[11px] text-gray-400">~Sprint 16</span>
              </div>
            </div>

            {roadmapLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-white rounded-xl border animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sprints.map((s, idx) => (
                  <div key={s._id} className="bg-white rounded-xl shadow-sm border border-l-4 border-l-green-400 p-4 flex gap-3">
                    <div className="shrink-0">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 text-green-700 text-xs font-extrabold border border-green-200">
                        {s.num}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-semibold text-gray-800 leading-tight">{s.title}</p>
                        {idx === sprints.length - 1 && (
                          <span className="shrink-0 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">Última</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {s.items.map((item) => (
                          <span key={item} className="text-[11px] bg-green-50 text-green-700 rounded px-1.5 py-0.5 border border-green-100">{item}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Next sprint placeholder */}
                <div className="bg-white rounded-xl shadow-sm border border-l-4 border-l-amber-400 p-4 flex gap-3 opacity-70">
                  <div className="shrink-0">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-700 text-xs font-extrabold border border-amber-200">
                      {nextSprintNum}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-600 leading-tight">Em planejamento</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {nextSprintCandidates.slice(0, 3).map((item) => (
                        <span key={item._id} className="text-[11px] bg-amber-50 text-amber-700 rounded px-1.5 py-0.5 border border-amber-100">{item.title}</span>
                      ))}
                      {nextSprintCandidates.length > 3 && (
                        <span className="text-[11px] text-gray-400 px-1.5 py-0.5">+ {nextSprintCandidates.length - 3} mais...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ ROADMAP ═══════════ */}
        {tab === "roadmap" && (
          <div>
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Roadmap</h2>
                <p className="text-sm text-gray-500">
                  {pendingCount} itens pendentes · {feitoCount} concluídos fora de sprint
                </p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(["Pendentes", "Alta", "Média", "Baixa", "Feito"] as RoadmapFilter[]).map((f) => {
                  const counts: Record<RoadmapFilter, number> = {
                    Pendentes: pendingCount,
                    Alta: allItems.filter((i) => i.priority === "Alta").length,
                    Média: allItems.filter((i) => i.priority === "Média").length,
                    Baixa: allItems.filter((i) => i.priority === "Baixa").length,
                    Feito: feitoCount,
                  };
                  return (
                    <button key={f} onClick={() => setRoadmapFilter(f)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        roadmapFilter === f ? "bg-[#01304D] text-white border-[#01304D]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}>
                      {f} <span className={`ml-1 ${roadmapFilter === f ? "text-white/70" : "text-gray-400"}`}>({counts[f]})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {roadmapLoading ? (
              <div className="space-y-6">
                {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-white rounded-xl border animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-8">
                {filteredRoadmap.map((theme) => {
                  const themeTotal = themes.find((t) => t.theme === theme.theme)?.items.length ?? 0;
                  const themeDone = themes.find((t) => t.theme === theme.theme)?.items.filter((i) => i.priority === "Feito").length ?? 0;
                  return (
                    <div key={theme.theme}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: theme.color }} />
                        <span className="text-sm font-bold text-gray-700">{theme.theme}</span>
                        {themeDone > 0 && (
                          <span className="text-xs text-gray-400">{themeDone}/{themeTotal} concluídos</span>
                        )}
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {theme.items.map((item) => (
                          <div key={item._id}
                            className={`bg-white rounded-xl shadow-sm border p-4 flex flex-col gap-2 transition-opacity ${
                              item.priority === "Feito" ? "opacity-70" : ""
                            }`}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-800 leading-tight">{item.title}</p>
                              <PriorityChip priority={item.priority} />
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed flex-1">{item.desc}</p>
                            <div className="flex flex-wrap gap-1">
                              {item.chips.map((c) => (
                                <span key={c} className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5 border border-gray-200">{c}</span>
                              ))}
                            </div>
                            {item.dep && (
                              <p className="text-xs text-gray-400 pt-1 border-t border-dashed border-gray-200">{item.dep}</p>
                            )}
                            {/* Toggle button — only for non-Clube/Auto items */}
                            {!["Clube", "Auto"].includes(item.originalPriority ?? item.priority) && (
                              <button
                                onClick={() => toggleItem(item)}
                                disabled={togglingId === item._id}
                                className={`mt-1 text-xs py-1.5 px-3 rounded-lg border font-medium transition-colors self-start disabled:opacity-50 ${
                                  item.priority === "Feito"
                                    ? "border-gray-200 text-gray-500 hover:bg-gray-50"
                                    : "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                                }`}>
                                {togglingId === item._id ? "..." : item.priority === "Feito" ? "↩ Reabrir" : "✓ Marcar como Feito"}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filteredRoadmap.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    Nenhum item com filtro &quot;{roadmapFilter}&quot;.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sprint form modal */}
      {showSprintForm && (
        <SprintFormModal
          nextNum={nextSprintNum}
          onClose={() => setShowSprintForm(false)}
          onSaved={(sprint) => {
            setSprints((prev) => [...prev, sprint].sort((a, b) => a.order - b.order));
            setShowSprintForm(false);
          }}
        />
      )}

      <p className="text-center text-xs text-gray-400 pb-8">
        Busca Leilões Caixa · BLC — Dashboard interno
      </p>
    </div>
  );
}
