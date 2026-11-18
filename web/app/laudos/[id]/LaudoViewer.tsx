"use client";

import { useState, useTransition } from "react";
import type { Laudo, BlocoLaudo } from "@/lib/laudos-types";

// ── Tipos do JSON de análise ──────────────────────────────────────────────────
type Alerta   = { gravidade: "critico" | "alto" | "medio" | "baixo"; descricao: string };
type Pessoa   = { nome: string; cpf?: string; qualificacao?: string; estadoCivil?: string; conjugeNome?: string; conjugeCpf?: string };
type Gravame  = { tipo: string; status: "ativo" | "cancelado" | "indeterminado"; descricao: string; dataRegistro?: string; credor?: string };
type Ato      = { identificador: string; tipo: string; data?: string; descricao: string; partes?: string[] };
type AlieFid  = { registrada: boolean; consolidada: boolean; credor?: string; dataConsolidacao?: string; observacoes?: string };
type AnaliseJson = {
  numeroMatricula?: string; cartorio?: string; municipio?: string; endereco?: string; area?: string; titularAtual?: string;
  pessoas?: Pessoa[]; atos?: Ato[]; gravames?: Gravame[]; alienacaoFiduciaria?: AlieFid;
  alertas?: Alerta[]; limitacoes?: string[];
};

// ── Cores de alerta ───────────────────────────────────────────────────────────
const ALERTA_COR: Record<string, { bg: string; text: string; border: string; label: string }> = {
  critico: { bg: "#FEE2E2", text: "#991B1B", border: "#F87171",  label: "CRÍTICO" },
  alto:    { bg: "#FEF3C7", text: "#92400E", border: "#FBBF24",  label: "ALTO" },
  medio:   { bg: "#EFF6FF", text: "#1E40AF", border: "#93C5FD",  label: "MÉDIO" },
  baixo:   { bg: "#F0FDF4", text: "#166534", border: "#86EFAC",  label: "BAIXO" },
};

const BLOCO_LABEL: Record<string, string> = {
  mercado:    "Análise de Mercado",
  matricula:  "Análise da Matrícula",
  juridica:   "Análise Jurídica",
  viabilidade: "Viabilidade Financeira",
  parecer:    "Parecer Final do Especialista",
};

const BLOCO_ICON: Record<string, string> = {
  mercado: "📊", matricula: "📋", juridica: "⚖️", viabilidade: "💰", parecer: "✅",
};

// ── Helpers de render ─────────────────────────────────────────────────────────
function parseLine(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ color: "#111827" }}>{p.slice(2, -2)}</strong>
      : p
  );
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let key = 0;
  for (const line of lines) {
    if (!line.trim()) { result.push(<div key={key++} style={{ height: 6 }} />); continue; }
    if (line.startsWith("### "))
      result.push(<h4 key={key++} style={{ margin: "14px 0 4px", fontSize: 13, fontWeight: 700, color: "#01304D" }}>{parseLine(line.slice(4))}</h4>);
    else if (line.startsWith("## "))
      result.push(<h3 key={key++} style={{ margin: "16px 0 6px", fontSize: 14, fontWeight: 700, color: "#01304D", borderBottom: "1px solid #CBD9E3", paddingBottom: 4 }}>{parseLine(line.slice(3))}</h3>);
    else if (line.startsWith("# "))
      result.push(<h2 key={key++} style={{ margin: "16px 0 6px", fontSize: 15, fontWeight: 700, color: "#01304D" }}>{parseLine(line.slice(2))}</h2>);
    else if (line.startsWith("- ") || line.startsWith("* "))
      result.push(<li key={key++} style={{ margin: "2px 0", fontSize: 12.5, color: "#374151", paddingLeft: 2 }}>{parseLine(line.slice(2))}</li>);
    else if (/^\d+\. /.test(line))
      result.push(<li key={key++} style={{ margin: "2px 0", fontSize: 12.5, color: "#374151", paddingLeft: 2 }}>{parseLine(line.replace(/^\d+\. /, ""))}</li>);
    else if (line.startsWith("> "))
      result.push(<blockquote key={key++} style={{ margin: "6px 0", paddingLeft: 12, borderLeft: "3px solid #F59E0B", color: "#6B7280", fontSize: 12 }}>{parseLine(line.slice(2))}</blockquote>);
    else
      result.push(<p key={key++} style={{ margin: "3px 0", fontSize: 12.5, color: "#374151", lineHeight: 1.6 }}>{parseLine(line)}</p>);
  }
  return result;
}

// ── Sub-componente: bloco textual editável ────────────────────────────────────
function BlocoEditor({ laudoId, blocoKey, bloco, canEdit }: {
  laudoId: string;
  blocoKey: string;
  bloco: BlocoLaudo;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bloco.conteudo ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!bloco.conteudo && bloco.status !== "concluido") return null;

  const save = () => {
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/laudos/${laudoId}/bloco`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: blocoKey, conteudo: draft }),
      });
      if (res.ok) { setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 2500); }
      else setError("Erro ao salvar. Tente novamente.");
    });
  };

  const isParecer = blocoKey === "parecer";

  return (
    <div style={{ background: "#fff", border: "1px solid #CBD9E3", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
      {/* Cabeçalho do bloco */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11 }}>{BLOCO_ICON[blocoKey]}</span>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#01304D" }}>{BLOCO_LABEL[blocoKey]}</h2>
          {saved && <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>✓ Salvo</span>}
        </div>
        {canEdit && !editing && (
          <button
            onClick={() => { setDraft(bloco.conteudo ?? ""); setEditing(true); }}
            style={{ fontSize: 12, fontWeight: 600, color: "#01304D", background: "#F4F9FC", border: "1px solid #CBD9E3", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}
          >
            ✏️ Editar
          </button>
        )}
      </div>

      {/* Modo edição */}
      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={Math.max(10, (draft.match(/\n/g)?.length ?? 0) + 3)}
            style={{ width: "100%", fontFamily: "monospace", fontSize: 12.5, lineHeight: 1.6, border: "1px solid #CBD9E3", borderRadius: 8, padding: 12, resize: "vertical", boxSizing: "border-box", color: "#1F2937", background: "#FAFAFA" }}
          />
          {error && <p style={{ margin: "4px 0", fontSize: 12, color: "#b91c1c" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              onClick={save}
              disabled={isPending}
              style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "#01304D", border: "none", borderRadius: 8, padding: "6px 18px", cursor: "pointer", opacity: isPending ? 0.6 : 1 }}
            >
              {isPending ? "Salvando…" : "💾 Salvar"}
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        /* Modo visualização */
        bloco.conteudo ? (
          isParecer ? (
            <div style={{ background: "#F4F9FC", border: "1px solid #CBD9E3", borderRadius: 8, padding: "16px 18px" }}>
              {renderMarkdown(bloco.conteudo)}
            </div>
          ) : (
            <div>{renderMarkdown(bloco.conteudo)}</div>
          )
        ) : (
          <p style={{ margin: 0, fontSize: 12.5, color: "#9CA3AF", fontStyle: "italic" }}>Sem conteúdo ainda.</p>
        )
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
interface Props {
  laudo: Laudo & { analiseMatriculaJson?: AnaliseJson };
  canEdit: boolean;
}

export default function LaudoViewer({ laudo, canEdit }: Props) {
  const analise = laudo.analiseMatriculaJson as AnaliseJson | undefined;
  const imovel  = laudo.imovelData as Record<string, string | number | undefined>;

  const dataHoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const numLaudo = laudo.numero
    ? `#${String(laudo.numero).padStart(4, "0")}`
    : `#${laudo._id!.slice(-8).toUpperCase()}`;

  const alertasCriticos = analise?.alertas?.filter(a => a.gravidade === "critico") ?? [];
  const alertasAltos    = analise?.alertas?.filter(a => a.gravidade === "alto")    ?? [];
  const alertasMedios   = analise?.alertas?.filter(a => a.gravidade === "medio")   ?? [];
  const alertasBaixos   = analise?.alertas?.filter(a => a.gravidade === "baixo")   ?? [];
  const totalAlertas = analise?.alertas?.length ?? 0;

  const situacao = alertasCriticos.length > 0
    ? { label: "CRÍTICA",              bg: "#FEE2E2", cor: "#991B1B" }
    : alertasAltos.length > 0
    ? { label: "ATENÇÃO",              bg: "#FEF3C7", cor: "#92400E" }
    : totalAlertas > 0
    ? { label: "REGULAR COM RESSALVAS", bg: "#EFF6FF", cor: "#1E40AF" }
    : { label: "REGULAR",              bg: "#F0FDF4", cor: "#166534" };

  const blocoKeys = ["mercado", "matricula", "juridica", "viabilidade", "parecer"] as const;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── CAPA ── */}
      <div style={{ background: "#01304D", color: "#fff", borderRadius: 16, padding: "28px 32px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#F59E0B", textTransform: "uppercase" }}>
              Busca Leilões Caixa
            </p>
            <h1 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700 }}>Laudo de Análise BLC</h1>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, opacity: 0.6 }}>
            <p style={{ margin: 0 }}>Emitido em {dataHoje}</p>
            <p style={{ margin: "4px 0 0", fontFamily: "monospace" }}>{numLaudo}</p>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 14, marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>Imóvel analisado</p>
          <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700 }}>{laudo.imovelDescricao}</p>
          {imovel.hdnImovel && <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.5 }}>Nº {imovel.hdnImovel}</p>}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {imovel.tipo       && <span style={{ background: "rgba(255,255,255,0.12)", padding: "3px 10px", borderRadius: 20, fontSize: 11 }}>{imovel.tipo}</span>}
          {imovel.areaTotal  && <span style={{ background: "rgba(255,255,255,0.12)", padding: "3px 10px", borderRadius: 20, fontSize: 11 }}>{imovel.areaTotal} m²</span>}
          {imovel.preco      && <span style={{ background: "#F59E0B", color: "#01304D", fontWeight: 700, padding: "3px 10px", borderRadius: 20, fontSize: 11 }}>
            {(imovel.preco as number).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
          </span>}
          {imovel.modalidade && <span style={{ background: "rgba(255,255,255,0.12)", padding: "3px 10px", borderRadius: 20, fontSize: 11 }}>{imovel.modalidade}</span>}
        </div>
      </div>

      {/* ── FAIXA DE SITUAÇÃO ── */}
      {analise && (
        <div style={{ background: situacao.bg, border: `1px solid ${situacao.cor}`, borderRadius: 10, padding: "12px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: situacao.cor, letterSpacing: 1 }}>SITUAÇÃO GERAL DO IMÓVEL</span>
            <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 700, color: situacao.cor }}>{situacao.label}</p>
          </div>
          <div style={{ textAlign: "right", fontSize: 11.5, color: situacao.cor }}>
            <p style={{ margin: 0 }}>{alertasCriticos.length} crítico{alertasCriticos.length !== 1 ? "s" : ""}</p>
            <p style={{ margin: 0 }}>{alertasAltos.length} alto{alertasAltos.length !== 1 ? "s" : ""} · {alertasMedios.length} médio{alertasMedios.length !== 1 ? "s" : ""} · {alertasBaixos.length} baixo{alertasBaixos.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      )}

      {/* ── ALERTAS ── */}
      {analise?.alertas && analise.alertas.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #CBD9E3", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11 }}>🚨</span>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#01304D" }}>Alertas da Análise</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {analise.alertas.map((a, i) => {
              const c = ALERTA_COR[a.gravidade] ?? ALERTA_COR.baixo;
              return (
                <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, whiteSpace: "nowrap" }}>
                    {c.label}
                  </span>
                  <p style={{ margin: 0, fontSize: 12.5, color: c.text, lineHeight: 1.5 }}>{a.descricao}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DADOS DA MATRÍCULA ── */}
      {analise && (
        <div style={{ background: "#fff", border: "1px solid #CBD9E3", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11 }}>🏠</span>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#01304D" }}>Dados da Matrícula</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px", fontSize: 12.5 }}>
            {([
              ["Nº Matrícula", analise.numeroMatricula],
              ["Cartório", analise.cartorio],
              ["Município", analise.municipio],
              ["Endereço", analise.endereco],
              ["Área", analise.area],
              ["Titular atual", analise.titularAtual],
            ] as [string, string | undefined][]).filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <span style={{ color: "#6B7280", fontSize: 11 }}>{k}</span>
                <p style={{ margin: "1px 0 0", fontWeight: 600, color: "#111827" }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PESSOAS ── */}
      {analise?.pessoas && analise.pessoas.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #CBD9E3", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11 }}>👤</span>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#01304D" }}>Pessoas Identificadas</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {analise.pessoas.map((p, i) => (
              <div key={i} style={{ background: "#F4F9FC", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                  <span style={{ fontWeight: 700, color: "#01304D", fontSize: 13 }}>{p.nome}</span>
                  <span style={{ background: "#01304D", color: "#fff", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10 }}>
                    {p.qualificacao ?? "—"}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", marginTop: 6, fontSize: 12 }}>
                  {p.cpf        && <span style={{ color: "#374151" }}>CPF: <strong>{p.cpf}</strong></span>}
                  {p.estadoCivil && <span style={{ color: "#374151" }}>Estado civil: <strong>{p.estadoCivil}</strong></span>}
                  {p.conjugeNome && (
                    <span style={{ color: "#6B7280" }}>Cônjuge: <strong>{p.conjugeNome}</strong>{p.conjugeCpf ? ` — CPF: ${p.conjugeCpf}` : ""}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GRAVAMES ── */}
      {analise?.gravames && analise.gravames.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #CBD9E3", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11 }}>🔒</span>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#01304D" }}>Gravames e Restrições</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {analise.gravames.map((g, i) => {
              const ativo   = g.status === "ativo";
              const indeter = g.status === "indeterminado";
              const bg  = ativo ? "#FEF3C7" : indeter ? "#EFF6FF" : "#F0FDF4";
              const cor = ativo ? "#92400E" : indeter ? "#1E40AF" : "#166534";
              return (
                <div key={i} style={{ background: bg, borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: cor, fontSize: 12.5 }}>{g.tipo}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: cor, background: "rgba(0,0,0,0.06)", padding: "2px 8px", borderRadius: 10 }}>
                      {g.status.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: "#374151" }}>{g.descricao}</p>
                  {(g.credor || g.dataRegistro) && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6B7280" }}>
                      {g.credor && `Credor: ${g.credor}`}{g.credor && g.dataRegistro && " · "}{g.dataRegistro && `Registro: ${g.dataRegistro}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ALIENAÇÃO FIDUCIÁRIA ── */}
      {analise?.alienacaoFiduciaria && (
        <div style={{ background: "#fff", border: "1px solid #CBD9E3", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11 }}>🏛️</span>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#01304D" }}>Alienação Fiduciária</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: 12.5 }}>
            <div>
              <span style={{ color: "#6B7280", fontSize: 11 }}>Registrada</span>
              <p style={{ margin: "1px 0 0", fontWeight: 600, color: analise.alienacaoFiduciaria.registrada ? "#166534" : "#6B7280" }}>
                {analise.alienacaoFiduciaria.registrada ? "Sim" : "Não"}
              </p>
            </div>
            <div>
              <span style={{ color: "#6B7280", fontSize: 11 }}>Consolidada em favor do credor</span>
              <p style={{ margin: "1px 0 0", fontWeight: 600, color: analise.alienacaoFiduciaria.consolidada ? "#166534" : "#6B7280" }}>
                {analise.alienacaoFiduciaria.consolidada ? "Sim" : "Não"}
              </p>
            </div>
            {analise.alienacaoFiduciaria.credor && (
              <div>
                <span style={{ color: "#6B7280", fontSize: 11 }}>Credor fiduciário</span>
                <p style={{ margin: "1px 0 0", fontWeight: 600, color: "#111827" }}>{analise.alienacaoFiduciaria.credor}</p>
              </div>
            )}
            {analise.alienacaoFiduciaria.dataConsolidacao && (
              <div>
                <span style={{ color: "#6B7280", fontSize: 11 }}>Data de consolidação</span>
                <p style={{ margin: "1px 0 0", fontWeight: 600, color: "#111827" }}>{analise.alienacaoFiduciaria.dataConsolidacao}</p>
              </div>
            )}
          </div>
          {analise.alienacaoFiduciaria.observacoes && (
            <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "#374151", lineHeight: 1.6 }}>{analise.alienacaoFiduciaria.observacoes}</p>
          )}
        </div>
      )}

      {/* ── HISTÓRICO DE ATOS ── */}
      {analise?.atos && analise.atos.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #CBD9E3", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11 }}>📜</span>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#01304D" }}>Histórico de Atos Registrais</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {analise.atos.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < analise.atos!.length - 1 ? "1px solid #E5E7EB" : "none" }}>
                <div style={{ flexShrink: 0, textAlign: "center" }}>
                  <span style={{ display: "inline-block", background: "#01304D", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>
                    {a.identificador}
                  </span>
                  {a.data && <p style={{ margin: "4px 0 0", fontSize: 10, color: "#9CA3AF", whiteSpace: "nowrap" }}>{a.data}</p>}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#1F2937" }}>{a.tipo}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#4B5563", lineHeight: 1.5 }}>{a.descricao}</p>
                  {a.partes && a.partes.length > 0 && (
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: "#6B7280" }}>Partes: {a.partes.join(", ")}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BLOCOS TEXTUAIS EDITÁVEIS ── */}
      {blocoKeys.map((key) => {
        const bloco = (laudo.blocos as Record<string, BlocoLaudo | undefined>)[key];
        if (!bloco) return null;
        return (
          <BlocoEditor
            key={key}
            laudoId={laudo._id!}
            blocoKey={key}
            bloco={bloco}
            canEdit={canEdit}
          />
        );
      })}

      {/* ── LIMITAÇÕES ── */}
      {analise?.limitacoes && analise.limitacoes.length > 0 && (
        <div style={{ background: "#FEF9C3", border: "1px solid #FDE047", borderRadius: 10, padding: "12px 18px", marginBottom: 20 }}>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#713F12" }}>⚠️ Limitações da Análise</p>
          {analise.limitacoes.map((l, i) => (
            <p key={i} style={{ margin: "2px 0", fontSize: 12, color: "#713F12" }}>• {l}</p>
          ))}
        </div>
      )}

      {/* ── FAIXA DE AUTORIA ── */}
      <div style={{ background: "#F4F9FC", border: "1px solid #CBD9E3", borderRadius: 10, padding: "12px 18px", marginBottom: 20, fontSize: 12.5 }}>
        <strong style={{ color: "#01304D" }}>✅ Laudo revisado por especialista —</strong>{" "}
        <span style={{ color: "#374151" }}>
          Este relatório foi produzido com auxílio de IA e revisado manualmente por Vítor Valença,
          especialista em leilões da Caixa com dezenas de arrematações realizadas.
        </span>
      </div>

      {/* ── RODAPÉ ── */}
      <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 20, textAlign: "center", fontSize: 11, color: "#9CA3AF" }}>
        <p style={{ margin: 0 }}>Busca Leilões Caixa · buscaleiloescaixa.com.br</p>
        <p style={{ margin: "4px 0 0" }}>
          Este laudo é de uso exclusivo do comprador e não substitui assessoria jurídica profissional.
        </p>
        <p style={{ margin: "4px 0 0", fontFamily: "monospace", opacity: 0.5 }}>{numLaudo} · {laudo._id}</p>
      </div>
    </div>
  );
}
