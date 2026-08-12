"use client";

import { useEffect, useState, useCallback } from "react";

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

const REFRESH_INTERVAL = 30;

function timeAgo(iso: string | number): string {
  const ts = typeof iso === "number" ? iso : Date.parse(iso);
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

function WorkflowBadge({ run }: { run: WorkflowRun }) {
  if (run.status === "in_progress" || run.status === "queued") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
        {run.status === "queued" ? "Na fila" : "Em execução"}
      </span>
    );
  }
  if (run.conclusion === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Sucesso
      </span>
    );
  }
  if (run.conclusion === "failure" || run.conclusion === "timed_out") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        {run.conclusion === "timed_out" ? "Timeout" : "Falhou"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      {run.conclusion ?? run.status}
    </span>
  );
}

function DeployBadge({ state }: { state: Deployment["state"] }) {
  if (state === "BUILDING" || state === "INITIALIZING" || state === "QUEUED") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
        {state === "QUEUED" ? "Na fila" : "Building"}
      </span>
    );
  }
  if (state === "READY") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Online
      </span>
    );
  }
  if (state === "ERROR") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Erro
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      {state}
    </span>
  );
}

function eventLabel(event: string) {
  const map: Record<string, string> = {
    schedule: "Agendado",
    workflow_dispatch: "Manual",
    push: "Push",
    pull_request: "PR",
  };
  return map[event] ?? event;
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/status");
      if (!res.ok) { setError("Não autorizado ou erro na API."); return; }
      setData(await res.json());
      setLastUpdate(new Date());
      setCountdown(REFRESH_INTERVAL);
      setError("");
    } catch {
      setError("Falha ao carregar status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Countdown
  useEffect(() => {
    const timer = setInterval(() => setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL : c - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Status do Sistema</h1>
          <p className="text-sm text-gray-500 mt-1">
            GitHub Actions · Vercel Deployments — atualiza automaticamente a cada {REFRESH_INTERVAL}s
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-gray-400">
              Atualizado às {lastUpdate.toLocaleTimeString("pt-BR")} · próximo em {countdown}s
            </span>
          )}
          <button
            onClick={fetchData}
            className="text-sm px-3 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ↺ Atualizar
          </button>
          <a
            href="/admin"
            className="text-sm text-blue-600 hover:underline px-3 py-2"
          >
            ← Admin
          </a>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* GitHub Actions */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              <h2 className="text-base font-bold text-gray-800">GitHub Actions</h2>
              <span className="text-xs text-gray-400 font-normal ml-1">
                — {data?.workflows.length ?? 0} workflow{(data?.workflows.length ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>

            {!data?.workflows.length ? (
              <p className="text-gray-400 text-sm py-6 text-center">Nenhum workflow encontrado.</p>
            ) : (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 font-medium">Workflow</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Gatilho</th>
                      <th className="px-4 py-3 font-medium">Branch</th>
                      <th className="px-4 py-3 font-medium">Executado</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.workflows
                      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
                      .map((run) => (
                        <tr
                          key={run.workflow_id}
                          className={`border-b last:border-0 ${
                            run.conclusion === "failure" || run.conclusion === "timed_out"
                              ? "bg-red-50"
                              : run.status === "in_progress"
                              ? "bg-yellow-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{run.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {run.path.replace(".github/workflows/", "")}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <WorkflowBadge run={run} />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-500">{eventLabel(run.event)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono text-gray-600">{run.head_branch}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {timeAgo(run.updated_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <a
                              href={run.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                            >
                              Ver →
                            </a>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Vercel Deployments */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 22.525H0l12-21.05 12 21.05z"/>
              </svg>
              <h2 className="text-base font-bold text-gray-800">Vercel Deployments</h2>
              <span className="text-xs text-gray-400 font-normal ml-1">
                — últimos {data?.deployments.length ?? 0}
              </span>
            </div>

            {!data?.deployments.length ? (
              <p className="text-gray-400 text-sm py-6 text-center">Nenhum deploy encontrado.</p>
            ) : (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 font-medium">Commit</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Branch</th>
                      <th className="px-4 py-3 font-medium">Autor</th>
                      <th className="px-4 py-3 font-medium">Quando</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.deployments.map((dep) => (
                      <tr
                        key={dep.uid}
                        className={`border-b last:border-0 ${
                          dep.state === "ERROR"
                            ? "bg-red-50"
                            : dep.state === "BUILDING" || dep.state === "INITIALIZING"
                            ? "bg-yellow-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-medium text-gray-800 truncate">
                            {dep.meta?.githubCommitMessage?.split("\n")[0] ?? dep.name}
                          </p>
                          {dep.meta?.githubCommitSha && (
                            <p className="text-xs font-mono text-gray-400 mt-0.5">
                              {dep.meta.githubCommitSha.slice(0, 7)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <DeployBadge state={dep.state} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-gray-600">
                            {dep.meta?.githubCommitRef ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {dep.creator?.username ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {timeAgo(dep.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {dep.state === "READY" && dep.url && (
                            <a
                              href={`https://${dep.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                            >
                              Ver →
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
