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

// ── Static data ────────────────────────────────────────────────────────────
const SPRINTS = [
  { num: "1", title: "SEO Técnico + Analytics", items: ["Google Analytics 4", "Meta Pixel", "Vercel Analytics"] },
  { num: "2", title: "Páginas SEO por Estado/Cidade", items: ["/imoveis/[estado]", "/imoveis/[estado]/[cidade]", "Bandeiras dos estados"] },
  { num: "3", title: "SEO Avançado + /novidades", items: ["JSON-LD", "FAQ Schema", "Sitemap dinâmico"] },
  { num: "4", title: "Favoritos + Filtros Avançados", items: ["Favoritos por usuário", "Filtros área/vagas/FGTS", "Ordenação"] },
  { num: "5", title: "Blog + Painel Admin", items: ["Blog MongoDB", "Sync YouTube", "Admin posts"] },
  { num: "6", title: "Corretores", items: ["/corretores", "Bloco no imóvel", "Admin corretores"] },
  { num: "7", title: "Enriquecimento Incremental", items: ["enrich.py", "GitHub Actions", "Matrícula + PDF", "9.855 matrículas"] },
  { num: "8", title: "Redesign Visual — Petróleo & Âmbar", items: ["Nova paleta #01304D", "Header + footer", "Cards + filtros", "Carousel hero"] },
  { num: "9", title: "Auth + Usuários + Mobile", items: ["Cadastro / login", "Plano freemium", "Google OAuth", "Admin usuários", "Menu mobile", "Phone mask + flag"] },
  { num: "10", title: "Clube BLC (base) + IA + R2", items: ["Página /clube", "Descrições IA (Haiku)", "Export PDF + auth gate", "Fotos → R2 (24k+)", "Popup de cadastro", "Admin social/copy IA"] },
];

const ROADMAP = [
  {
    theme: "Comunicação com Usuários",
    color: "bg-amber-500",
    items: [
      {
        title: "Alertas por E-mail",
        priority: "Alta",
        priorityColor: "bg-amber-100 text-amber-800",
        desc: "Disparar e-mail automático quando novo imóvel corresponder às preferências de estado/cidade do usuário.",
        chips: ["SendGrid / Resend", "Job agendado"],
        dep: "Infraestrutura DB pronta — preferências já salvas",
      },
    ],
  },
  {
    theme: "Clube BLC — Monetização",
    color: "bg-violet-500",
    items: [
      {
        title: 'Formulário "Nova Compra"',
        priority: "Clube",
        priorityColor: "bg-violet-100 text-violet-800",
        desc: "Registro da compra no site após finalizar na Caixa — HDN, modalidade e assessor indicado.",
        chips: ["Formulário no site", "API + MongoDB"],
        dep: "",
      },
      {
        title: "Dashboard de Compra + Checklist",
        priority: "Clube",
        priorityColor: "bg-violet-100 text-violet-800",
        desc: "Área do membro para acompanhar o status da compra passo a passo até o registro.",
        chips: ["Área logada", "Status por etapa"],
        dep: "",
      },
      {
        title: "Lógica de Cashback",
        priority: "Clube",
        priorityColor: "bg-violet-100 text-violet-800",
        desc: "Calcular e registrar cashback do usuário (0,5% → 1% conforme histórico). Visualização no perfil e admin.",
        chips: ["Escalonamento", "Histórico"],
        dep: "",
      },
      {
        title: "Gestão de Assessores Parceiros",
        priority: "Clube",
        priorityColor: "bg-violet-100 text-violet-800",
        desc: "Admin para cadastrar assessores, vincular compras e controlar comissão por compra finalizada.",
        chips: ["Admin panel", "Comissão"],
        dep: "Depende de Formulário Nova Compra",
      },
      {
        title: "Pagamento — Plano Premium",
        priority: "Clube",
        priorityColor: "bg-violet-100 text-violet-800",
        desc: "Checkout de assinatura para acesso premium via Stripe ou Mercado Pago.",
        chips: ["Stripe / MP", "Webhook"],
        dep: "",
      },
    ],
  },
  {
    theme: "Área de Membros",
    color: "bg-green-600",
    items: [
      {
        title: "Planilha de Viabilidade Financeira",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Calculadora interativa de custos, retorno e riscos. Card já existe em /ferramentas, falta a implementação.",
        chips: ["Calculadora no browser", "Exclusivo membros"],
        dep: "",
      },
      {
        title: "Feature Gating Gratuito vs Premium",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Campo 'plano' existe no DB mas sem bloqueio de conteúdo na UI. Locks + CTA de upgrade onde aplicável.",
        chips: ["Feature gating", "CTA upgrade"],
        dep: "",
      },
    ],
  },
  {
    theme: "UX & Cadastro",
    color: "bg-sky-500",
    items: [
      {
        title: "Seleção de Regiões no Cadastro",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Adicionar seleção de estados/cidades preferidos no fluxo de cadastro, não apenas no perfil.",
        chips: ["UX melhoria", "/cadastro"],
        dep: "",
      },
    ],
  },
  {
    theme: "Corretores",
    color: "bg-gray-500",
    items: [
      {
        title: "Integração Corretores × Clube BLC",
        priority: "Baixa",
        priorityColor: "bg-gray-100 text-gray-600",
        desc: "Vincular o sistema de corretores ao programa de cashback — corretores podem atuar como assessores BLC.",
        chips: ["Integração", "Gestão de papéis"],
        dep: "Depende de Gestão de Assessores BLC",
      },
    ],
  },
  {
    theme: "Dados — Automático",
    color: "bg-emerald-500",
    items: [
      {
        title: "Imóveis sem Enriquecimento",
        priority: "Auto",
        priorityColor: "bg-emerald-100 text-emerald-800",
        desc: "~4.720 imóveis ainda não enriquecidos. Workflow processa automaticamente ~700/dia — sem ação manual.",
        chips: ["GitHub Actions", "~7 dias restantes"],
        dep: "✓ Processando automaticamente",
      },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const REFRESH = 30;

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
  if (run.status !== "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
        {run.status === "queued" ? "Na fila" : "Executando"}
      </span>
    );
  }
  if (run.conclusion === "success") return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Sucesso
    </span>
  );
  if (run.conclusion === "failure" || run.conclusion === "timed_out") return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{run.conclusion === "timed_out" ? "Timeout" : "Falhou"}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />{run.conclusion ?? run.status}
    </span>
  );
}

function DeployBadge({ state }: { state: Deployment["state"] }) {
  if (state === "BUILDING" || state === "INITIALIZING" || state === "QUEUED") return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />{state === "QUEUED" ? "Na fila" : "Building"}
    </span>
  );
  if (state === "READY") return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Online
    </span>
  );
  if (state === "ERROR") return (
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

// ── Section label ──────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xs font-bold tracking-widest uppercase text-gray-400">{children}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function StatusPage() {
  const [live, setLive] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/status");
      if (!res.ok) { setError("Não autorizado ou erro na API."); return; }
      setLive(await res.json());
      setLastUpdate(new Date());
      setCountdown(REFRESH);
      setError("");
    } catch {
      setError("Falha ao carregar status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, REFRESH * 1000);
    return () => clearInterval(iv);
  }, [fetchData]);

  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => (c <= 1 ? REFRESH : c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const totalPending = ROADMAP.reduce((acc, t) => acc + t.items.length, 0);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-12">

      {/* ── Header ── */}
      <div>
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-amber-600 mb-1">Busca Leilões Caixa · BLC</p>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard do Projeto</h1>
            <p className="text-sm text-gray-500 mt-1">
              Status ao vivo · Histórico de sprints · Roadmap pendente
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {lastUpdate && (
              <span className="text-xs text-gray-400">
                Atualizado às {lastUpdate.toLocaleTimeString("pt-BR")} · próximo em {countdown}s
              </span>
            )}
            <button onClick={fetchData}
              className="text-sm px-3 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
              ↺ Atualizar
            </button>
            <a href="/admin" className="text-sm text-blue-600 hover:underline px-3 py-2">← Admin</a>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { num: "10", label: "Sprints concluídas", color: "border-green-400" },
            { num: String(totalPending), label: "Itens pendentes", color: "border-amber-400" },
            { num: "25k+", label: "Imóveis no banco", color: "border-blue-400" },
            { num: "9.855", label: "Matrículas enriquecidas", color: "border-violet-400" },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-xl border-l-4 ${s.color} shadow-sm px-4 py-3`}>
              <div className="text-2xl font-extrabold text-gray-800 font-mono">{s.num}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── GitHub Actions ── */}
      <div>
        <SectionLabel>
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub Actions — ao vivo
          </span>
        </SectionLabel>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border h-24 flex items-center justify-center text-sm text-gray-400">Carregando...</div>
        ) : !live?.workflows.length ? (
          <div className="bg-white rounded-xl shadow-sm border h-24 flex items-center justify-center text-sm text-gray-400">Nenhum workflow encontrado.</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
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
                {live.workflows
                  .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
                  .map((run) => (
                    <tr key={run.workflow_id}
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
                        <a href={run.html_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline">Ver →</a>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Vercel Deployments ── */}
      <div>
        <SectionLabel>
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 22.525H0l12-21.05 12 21.05z"/></svg>
            Vercel Deployments — ao vivo
          </span>
        </SectionLabel>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border h-24 flex items-center justify-center text-sm text-gray-400">Carregando...</div>
        ) : !live?.deployments.length ? (
          <div className="bg-white rounded-xl shadow-sm border h-24 flex items-center justify-center text-sm text-gray-400">Nenhum deploy encontrado.</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
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
                        <a href={`https://${dep.url}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline">Ver →</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Sprint History ── */}
      <div>
        <SectionLabel>Histórico — 10 Sprints Concluídas</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SPRINTS.map((s) => (
            <div key={s.num} className="bg-white rounded-xl shadow-sm border border-l-4 border-l-green-400 p-4 flex gap-3">
              <div className="shrink-0 mt-0.5">
                <span className="text-xs font-bold bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5 whitespace-nowrap">
                  Sprint {s.num}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 leading-tight">{s.title}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.items.map((item) => (
                    <span key={item} className="text-xs bg-green-50 text-green-700 rounded px-1.5 py-0.5">{item}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Roadmap ── */}
      <div>
        <SectionLabel>Roadmap — {totalPending} Itens Pendentes</SectionLabel>
        <div className="space-y-8">
          {ROADMAP.map((theme) => (
            <div key={theme.theme}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`${theme.color} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                  {theme.theme}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {theme.items.map((item) => (
                  <div key={item.title} className="bg-white rounded-xl shadow-sm border p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800 leading-tight">{item.title}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${item.priorityColor}`}>
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {item.chips.map((c) => (
                        <span key={c} className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5 border border-gray-200">{c}</span>
                      ))}
                    </div>
                    {item.dep && (
                      <p className="text-xs text-gray-400 pt-1 border-t border-dashed border-gray-200">{item.dep}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 pb-4">
        Busca Leilões Caixa · BLC — Dashboard interno · Dados ao vivo do GitHub e Vercel
      </p>
    </div>
  );
}
