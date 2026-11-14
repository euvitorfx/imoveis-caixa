"use client";

import { useEffect, useState, useCallback } from "react";

type Metricas = {
  atualizado: string;
  usuarios: {
    total: number; premium: number; gratuito: number; comTelefone: number;
    hoje: number; semana: number; mes: number;
    recentes: { name: string; email: string; plano: string; criadoEm?: string; telefone?: string }[];
  };
  imoveis: { total: number };
  funil: {
    views:  { total: number; hoje: number; semana: number };
    clicks: { total: number; hoje: number; semana: number };
  };
  laudos: {
    total: number; aguardando: number; pagos: number; em_producao: number;
    entregues: number; cancelados: number; receita: number;
  };
  email: { enviados: number; aberturas: number; taxa: number };
  eventosRecentes: { tipo: string; quem: string; logado: boolean; nivel: number | null; imovel: string | null; em: string }[];
};

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function KPI({
  icon, label, value, sub, accent = false, warning = false,
}: {
  icon: string; label: string; value: string | number; sub?: string; accent?: boolean; warning?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{
        background: accent ? "#01304D" : warning ? "#FEF3C7" : "white",
        border: `1px solid ${accent ? "transparent" : warning ? "#F59E0B40" : "#E5E7EB"}`,
        color: accent ? "white" : "#111827",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg">{icon}</span>
        {sub && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: accent ? "rgba(255,255,255,0.15)" : warning ? "#FDE68A" : "#F3F4F6",
              color: accent ? "white" : warning ? "#92400E" : "#374151",
            }}
          >
            {sub}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold leading-tight" style={{ color: accent ? "white" : warning ? "#92400E" : "#01304D" }}>
        {value}
      </div>
      <div className="text-xs font-medium" style={{ color: accent ? "rgba(255,255,255,0.65)" : "#6B7280" }}>
        {label}
      </div>
    </div>
  );
}

function FunilBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 4;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span className="font-medium">{label}</span>
        <span className="font-bold" style={{ color }}>{value.toLocaleString("pt-BR")}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const palette: Record<string, { bg: string; text: string }> = {
    blue:   { bg: "#DBEAFE", text: "#1D4ED8" },
    amber:  { bg: "#FEF3C7", text: "#92400E" },
    green:  { bg: "#D1FAE5", text: "#065F46" },
    gray:   { bg: "#F3F4F6", text: "#374151" },
    violet: { bg: "#EDE9FE", text: "#5B21B6" },
  };
  const { bg, text } = palette[color] ?? palette.gray;
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: bg, color: text }}>
      {children}
    </span>
  );
}

export default function AdminMetricas() {
  const [data,      setData]      = useState<Metricas | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [countdown, setCountdown] = useState(60);
  const INTERVAL = 60;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/metricas");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
      setCountdown(INTERVAL);
    }
  }, []);

  // Auto-refresh
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { load(); return INTERVAL; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [load]);

  if (loading && !data) {
    return <p className="text-gray-400 text-center py-16">Carregando métricas…</p>;
  }
  if (!data) return null;

  const { usuarios, imoveis, funil, laudos, email, eventosRecentes } = data;
  const taxaClick = funil.views.total > 0
    ? ((funil.clicks.total / funil.views.total) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">

      {/* Refresh indicator */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Atualizado às {new Date(data.atualizado).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          {" · "}próxima em {countdown}s
        </p>
        <button
          onClick={load}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ↻ Atualizar agora
        </button>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon="👥" label="Usuários cadastrados" value={usuarios.total}
          sub={usuarios.hoje > 0 ? `+${usuarios.hoje} hoje` : `+${usuarios.semana} 7d`} accent />
        <KPI icon="🏠" label="Imóveis no banco" value={imoveis.total.toLocaleString("pt-BR")} />
        <KPI icon="👁️" label="Views no Laudo BLC" value={funil.views.total}
          sub={funil.views.hoje > 0 ? `+${funil.views.hoje} hoje` : undefined} />
        <KPI icon="🖱️" label="Cliques no plano" value={funil.clicks.total}
          sub={funil.clicks.hoje > 0 ? `+${funil.clicks.hoje} hoje` : undefined}
          warning={funil.clicks.total > 0} />
      </div>

      {/* Linha 2: Funil + E-mail + Laudos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Funil de conversão */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Funil do Laudo BLC</h3>
            <span className="text-xs text-gray-400">conversão {taxaClick}%</span>
          </div>
          <div className="space-y-3">
            <FunilBar label="👁️ Visualizou botão" value={funil.views.total}  max={funil.views.total}  color="#01304D" />
            <FunilBar label="🖱️ Clicou no plano"  value={funil.clicks.total} max={funil.views.total}  color="#F59E0B" />
            <FunilBar label="📋 Laudos pagos"      value={laudos.pagos + laudos.em_producao + laudos.entregues} max={funil.views.total} color="#10B981" />
          </div>
          <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div>Esta semana<br/><strong className="text-gray-800">{funil.views.semana} views · {funil.clicks.semana} cliques</strong></div>
            <div>Hoje<br/><strong className="text-gray-800">{funil.views.hoje} views · {funil.clicks.hoje} cliques</strong></div>
          </div>
        </div>

        {/* E-mail */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Campanha de E-mail · Laudo BLC</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Enviados</span>
              <span className="text-sm font-bold text-gray-800">{email.enviados}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Aberturas (pixel)</span>
              <span className="text-sm font-bold text-gray-800">{email.aberturas}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Taxa de abertura</span>
              <span
                className="text-sm font-bold"
                style={{ color: email.taxa >= 20 ? "#059669" : email.taxa >= 10 ? "#D97706" : "#6B7280" }}
              >
                {email.taxa}%
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(email.taxa, 100)}%`, background: "#01304D" }} />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Taxa real provavelmente maior — muitos clientes bloqueiam pixel</p>
          </div>
        </div>

        {/* Laudos */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Laudos BLC</h3>
            {laudos.receita > 0 && (
              <span className="text-xs font-bold text-green-700">{fmt(laudos.receita)}</span>
            )}
          </div>
          <div className="space-y-2">
            {[
              { label: "Aguardando pagamento", n: laudos.aguardando,  color: "amber" },
              { label: "Pagos (em produção)",  n: laudos.pagos + laudos.em_producao, color: "blue" },
              { label: "Entregues",            n: laudos.entregues,   color: "green" },
              { label: "Cancelados",           n: laudos.cancelados,  color: "gray" },
            ].map(({ label, n, color }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{label}</span>
                <Badge color={color}>{n}</Badge>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-gray-100 text-xs text-gray-400">
            {laudos.total === 0
              ? "Nenhum laudo solicitado ainda"
              : `${laudos.total} laudo${laudos.total !== 1 ? "s" : ""} no total`}
          </div>
        </div>
      </div>

      {/* Linha 3: Usuários + Feed de atividade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Usuários recentes */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Cadastros recentes</h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>+{usuarios.semana} semana</span>
              <span className="font-bold text-blue-700">+{usuarios.mes} mês</span>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {usuarios.recentes.length === 0 ? (
              <p className="px-5 py-6 text-xs text-gray-400 text-center">Nenhum cadastro recente</p>
            ) : usuarios.recentes.map((u, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.name || "—"}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {u.telefone && <span className="text-xs text-green-600">📱</span>}
                  <Badge color={u.plano === "premium" ? "violet" : "gray"}>
                    {u.plano ?? "gratuito"}
                  </Badge>
                  {u.criadoEm && (
                    <span className="text-xs text-gray-400">{relTime(u.criadoEm)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feed de atividade */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Atividade recente — Funil</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-400">ao vivo</span>
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {eventosRecentes.length === 0 ? (
              <p className="px-5 py-6 text-xs text-gray-400 text-center">Nenhum evento ainda</p>
            ) : eventosRecentes.map((e, i) => {
              const isClick = e.tipo === "clicou_plano";
              return (
                <div key={i} className="px-5 py-2.5 flex items-center gap-3">
                  <span className="text-base shrink-0">{isClick ? "🖱️" : "👁️"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: isClick ? "#01304D" : "#374151" }}>
                      {e.quem}
                      {isClick && e.nivel && (
                        <span className="ml-1.5 text-amber-700 font-semibold">
                          · R${e.nivel === 1 ? "97" : "297"}
                        </span>
                      )}
                    </p>
                    {e.imovel && <p className="text-xs text-gray-400 font-mono truncate">{e.imovel}…</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{relTime(e.em)}</p>
                    <p className="text-xs" style={{ color: e.logado ? "#059669" : "#9CA3AF" }}>
                      {e.logado ? "logado" : "anon"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Resumo usuários (linha extra) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Base de usuários</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total",         value: usuarios.total,        color: "#01304D" },
            { label: "Premium",       value: usuarios.premium,      color: "#7C3AED" },
            { label: "Gratuito",      value: usuarios.gratuito,     color: "#6B7280" },
            { label: "Com WhatsApp",  value: usuarios.comTelefone,  color: "#059669" },
            { label: "Sem WhatsApp",  value: usuarios.total - usuarios.comTelefone, color: "#D97706" },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
