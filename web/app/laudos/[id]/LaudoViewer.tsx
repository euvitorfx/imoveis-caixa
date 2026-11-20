"use client";

import { useState, useTransition, useRef } from "react";
import type { Laudo, BlocoLaudo, AnuncioComparavel, AvaliacaoMercado, AnaliseFinanceira } from "@/lib/laudos-types";

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
  const [displayContent, setDisplayContent] = useState(bloco.conteudo ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!displayContent && bloco.status !== "concluido") return null;

  const save = () => {
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/laudos/${laudoId}/bloco`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: blocoKey, conteudo: draft }),
      });
      if (res.ok) {
        setDisplayContent(draft);
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 2500);
      } else setError("Erro ao salvar. Tente novamente.");
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
            onClick={() => { setDraft(displayContent); setEditing(true); }}
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
        displayContent ? (
          isParecer ? (
            <div style={{ background: "#F4F9FC", border: "1px solid #CBD9E3", borderRadius: 8, padding: "16px 18px" }}>
              {renderMarkdown(displayContent)}
            </div>
          ) : (
            <div>{renderMarkdown(displayContent)}</div>
          )
        ) : (
          <p style={{ margin: 0, fontSize: 12.5, color: "#9CA3AF", fontStyle: "italic" }}>Sem conteúdo ainda.</p>
        )
      )}
    </div>
  );
}

// ── Seção 1: Links do imóvel ──────────────────────────────────────────────────
function LinksImovel({ laudo }: { laudo: Laudo }) {
  const imovel = laudo.imovelData as Record<string, string | undefined>;
  const hdnImovel = imovel.hdnImovel;
  const blcUrl = `https://www.buscaleiloescaixa.com.br/imovel/${laudo.imovelId}`;
  const caixaUrl = hdnImovel
    ? `https://venda-imoveis.caixa.gov.br/sistema/detalhe-imovel.asp?hdnimovel=${hdnImovel}`
    : (imovel.urlDetalhe ?? null);

  return (
    <div style={{ background: "#fff", border: "1px solid #CBD9E3", borderRadius: 12, padding: "16px 24px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 11 }}>🔗</span>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#01304D" }}>Links do Imóvel</h2>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <a
          href={blcUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#01304D", color: "#fff", fontWeight: 600, fontSize: 12.5, padding: "7px 14px", borderRadius: 8, textDecoration: "none" }}
        >
          Ver no Busca Leilões Caixa →
        </a>
        {caixaUrl && (
          <a
            href={caixaUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F59E0B", color: "#01304D", fontWeight: 600, fontSize: 12.5, padding: "7px 14px", borderRadius: 8, textDecoration: "none" }}
          >
            Ver no site da Caixa →
          </a>
        )}
      </div>
    </div>
  );
}

// ── Seção 2: Screenshot Caixa ─────────────────────────────────────────────────
function ScreenshotCaixa({ laudo, canEdit }: { laudo: Laudo; canEdit: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState<string | undefined>(laudo.screenshotCaixaUrl);
  const [erro, setErro] = useState("");

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("tipo", "screenshot");
    fd.append("arquivo", file);
    const res = await fetch(`/api/admin/laudos/${laudo._id}/upload`, { method: "POST", body: fd });
    const json = await res.json() as { url?: string };
    if (json.url) setUrl(json.url);
    setUploading(false);
  }

  async function handleRemove() {
    if (!url) return;
    setUploading(true);
    await fetch(`/api/admin/laudos/${laudo._id}/upload`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "screenshot", url }),
    });
    setUrl(undefined);
    setUploading(false);
  }

  if (!url && !canEdit) return null;

  return (
    <div style={{ background: "#fff", border: "1px solid #CBD9E3", borderRadius: 12, padding: "16px 24px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11 }}>📸</span>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#01304D" }}>Print da Página Caixa</h2>
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ background: "#01304D", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
            >
              {uploading ? "Enviando…" : url ? "Substituir print" : "Enviar print"}
            </button>
            {url && (
              <button
                onClick={handleRemove}
                disabled={uploading}
                style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", color: "#991B1B" }}
              >
                Remover
              </button>
            )}
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
      />
      {erro && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>{erro}</p>}
      {url ? (
        <img src={url} alt="Foto/print do imóvel na Caixa" style={{ width: "100%", borderRadius: 8, border: "1px solid #E5E7EB" }} />
      ) : (
        <div style={{ background: "#F9FAFB", border: "2px dashed #D1D5DB", borderRadius: 8, padding: "32px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 12.5 }}>
          Envie um print da página do imóvel no site da Caixa clicando em &ldquo;Enviar print&rdquo;.
        </div>
      )}
    </div>
  );
}

// ── Seção 3: Fotos do imóvel ──────────────────────────────────────────────────
function FotosImovel({ laudo, canEdit }: { laudo: Laudo; canEdit: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [extras, setExtras] = useState<string[]>(laudo.fotosAdicionais ?? []);
  const [erro, setErro] = useState("");

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("tipo", "foto");
    fd.append("arquivo", file);
    const res = await fetch(`/api/admin/laudos/${laudo._id}/upload`, { method: "POST", body: fd });
    const json = await res.json() as { url?: string };
    if (json.url) setExtras((prev) => [...prev, json.url!]);
    setUploading(false);
  }

  async function handleRemoveFoto(url: string) {
    await fetch(`/api/admin/laudos/${laudo._id}/upload`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "foto", url }),
    });
    setExtras((prev) => prev.filter((f) => f !== url));
  }

  if (!extras.length && !canEdit) return null;

  return (
    <div style={{ background: "#fff", border: "1px solid #CBD9E3", borderRadius: 12, padding: "16px 24px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11 }}>🏠</span>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#01304D" }}>Fotos do Imóvel</h2>
        </div>
        {canEdit && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ background: "#01304D", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
          >
            {uploading ? "Enviando…" : "+ Adicionar foto"}
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
      />
      {erro && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>{erro}</p>}
      {extras.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {extras.map((src, i) => (
            <div key={src} style={{ position: "relative" }}>
              <img
                src={src}
                alt={`Foto ${i + 1}`}
                onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none"; }}
                style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 8, border: "1px solid #E5E7EB", display: "block" }}
              />
              {canEdit && (
                <button
                  onClick={() => handleRemoveFoto(src)}
                  style={{ position: "absolute", top: 4, right: 4, background: "#01304D", color: "#fff", border: "none", borderRadius: 4, width: 22, height: 22, fontSize: 13, cursor: "pointer", lineHeight: "22px", textAlign: "center" }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {extras.length === 0 && (
        <div style={{ background: "#F9FAFB", border: "2px dashed #D1D5DB", borderRadius: 8, padding: "32px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 12.5 }}>
          Nenhuma foto disponível.
        </div>
      )}
    </div>
  );
}

// ── Seção 4: Mapa ─────────────────────────────────────────────────────────────
function MapaImovel({
  laudo,
  analise,
  canEdit,
}: {
  laudo: Laudo;
  analise: AnaliseJson | undefined;
  canEdit: boolean;
}) {
  const imovel = laudo.imovelData as Record<string, string | undefined>;
  const enderecoInicial =
    laudo.localizacao?.enderecoMaps ??
    [analise?.endereco, imovel.cidade, imovel.uf ?? imovel.estado].filter(Boolean).join(", ");

  const [endereco, setEndereco] = useState(enderecoInicial);
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState(enderecoInicial);
  const [saving, setSaving] = useState(false);

  async function salvarEndereco() {
    setSaving(true);
    await fetch(`/api/admin/laudos/${laudo._id}/localidade`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enderecoMaps: draft }),
    });
    setEndereco(draft);
    setEditando(false);
    setSaving(false);
  }

  if (!endereco) return null;

  const mapsEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(endereco)}&output=embed`;
  const mapsLink  = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;

  return (
    <div style={{ background: "#fff", border: "1px solid #CBD9E3", borderRadius: 12, padding: "16px 24px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11 }}>📍</span>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#01304D" }}>Localização</h2>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: "#F59E0B", color: "#01304D", fontWeight: 600, fontSize: 11.5, padding: "5px 12px", borderRadius: 6, textDecoration: "none" }}
          >
            Abrir no Maps →
          </a>
          {canEdit && !editando && (
            <button
              onClick={() => { setDraft(endereco); setEditando(true); }}
              style={{ background: "#F3F4F6", border: "1px solid #D1D5DB", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", color: "#374151" }}
            >
              Editar endereço
            </button>
          )}
        </div>
      </div>

      {editando ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ flex: 1, minWidth: 200, border: "1px solid #93C5FD", borderRadius: 6, padding: "6px 10px", fontSize: 13 }}
            placeholder="Endereço completo para o mapa"
          />
          <button
            onClick={salvarEndereco}
            disabled={saving}
            style={{ background: "#01304D", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
          <button
            onClick={() => setEditando(false)}
            style={{ background: "#F3F4F6", border: "1px solid #D1D5DB", borderRadius: 6, padding: "6px 10px", fontSize: 12.5, cursor: "pointer", color: "#374151" }}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#6B7280" }}>{endereco}</p>
      )}

      <iframe
        src={mapsEmbed}
        width="100%"
        height="320"
        style={{ border: 0, borderRadius: 8 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Mapa do imóvel"
      />
    </div>
  );
}

// ── Seção 5: Avaliação de Mercado ─────────────────────────────────────────────

const PORTAIS = [
  { label: "ZAP Imóveis",  domain: "zapimoveis.com.br" },
  { label: "VivaReal",     domain: "vivareal.com.br" },
  { label: "OLX",          domain: "olx.com.br" },
  { label: "Imovelweb",    domain: "imovelweb.com.br" },
  { label: "Chave na Mão", domain: "chavenamao.com.br" },
  { label: "Loft",         domain: "loft.com.br" },
  { label: "Mercado Livre",domain: "mercadolivre.com.br" },
  { label: "Re/Max",       domain: "remax.com.br" },
  { label: "QuintoAndar",  domain: "quintoandar.com.br" },
  { label: "Facebook",     domain: "facebook.com" },
];

function idadeAnuncio(iso: string): { label: string; cor: string } {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias <= 30)  return { label: `há ${dias}d`,       cor: "#059669" };
  if (dias <= 90)  return { label: `há ${Math.round(dias / 7)}sem`, cor: "#D97706" };
  return               { label: `há ${Math.round(dias / 30)}m`,  cor: "#9CA3AF" };
}

function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function AvaliacaoMercadoImovel({ laudo, canEdit }: { laudo: Laudo; canEdit: boolean }) {
  const [dados, setDados] = useState<AvaliacaoMercado | null>(laudo.avaliacaoMercado ?? null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [expandido, setExpandido] = useState(false);
  const [promptCopiado, setPromptCopiado] = useState(false);

  const imovel = laudo.imovelData as Record<string, unknown>;
  const tipo    = String(imovel.tipo    ?? "imóvel");
  const cidade  = String(imovel.cidade  ?? "");
  const bairro  = String(imovel.bairro  ?? "");
  const estado  = String(imovel.estado  ?? "");
  const area    = Number(imovel.areaUtil ?? imovel.areaTotal ?? 0) || undefined;
  const precoLeilao = Number(imovel.preco ?? 0) || undefined;
  const precoAval   = Number(imovel.precoAval ?? 0) || undefined;

  async function buscar(force = false) {
    // Pede confirmação antes de sobrescrever resultados manuais
    if (dados?.source === "manual" && !force) {
      if (!confirm("Esta análise foi inserida manualmente. Substituir pela busca automática?")) return;
      force = true;
    }
    setBuscando(true);
    setErro(null);
    try {
      const url = `/api/admin/laudos/${laudo._id}/mercado${force ? "?force=true" : ""}`;
      const r = await fetch(url, { method: "POST" });
      const json = await r.json() as { ok?: boolean; cached?: boolean; error?: string; total?: number; stats?: AvaliacaoMercado["stats"]; message?: string };
      if (!r.ok) { setErro(json.error ?? "Erro na busca"); return; }
      // Recarrega os dados completos via GET
      const lr = await fetch(`/api/admin/laudos/${laudo._id}/mercado`);
      if (lr.ok) setDados(await lr.json() as AvaliacaoMercado);
    } catch (e) {
      setErro(`Erro: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBuscando(false);
    }
  }

  // Link de busca manual no portal
  function linkPortal(domain: string): string {
    const q = encodeURIComponent(`${tipo} venda ${bairro} ${cidade} ${estado} site:${domain}`);
    return `https://www.google.com/search?q=${q}`;
  }

  function gerarPrompt(): string {
    const imovel     = laudo.imovelData as Record<string, unknown>;
    const endereco   = String(imovel.endereco  ?? "");
    const areaUtil   = Number(imovel.areaUtil  ?? 0) || undefined;
    const areaTotal  = Number(imovel.areaTotal ?? 0) || undefined;
    const quartosCnt = Number(imovel.quartos   ?? 0) || undefined;
    const descricao  = String(imovel.descricao ?? laudo.imovelDescricao ?? "");
    const precoLeil  = Number(imovel.preco     ?? 0) || undefined;
    const precoAvalN = Number(imovel.precoAval ?? 0) || undefined;

    const fmtM = (n?: number) => n ? `${n}m²` : "—";
    const fmtR = (n?: number) => n ? `R$ ${n.toLocaleString("pt-BR")}` : "—";

    // Extrai nome do condomínio (mesma lógica do server)
    function extractCond(): string {
      for (const c of [imovel.empreendimento, imovel.condominio, imovel.nomeCondominio]) {
        const v = String(c ?? "").trim();
        if (v && v.length > 2 && v.toLowerCase() !== "undefined") return v;
      }
      for (const txt of [descricao, laudo.imovelDescricao ?? ""]) {
        const m = txt.match(/(?:residencial|condom[ií]nio|empreendimento|edificio|ed\.?|conjunto)\s+([\wÀ-ž]+)/i);
        if (m?.[1] && m[1].length > 2) return m[1];
      }
      return "";
    }

    const condNome = extractCond();
    const rua      = endereco.split(",")[0].trim();
    const areaRef  = areaUtil ?? areaTotal ?? 0;
    const areaMin  = areaRef > 0 ? Math.round(areaRef * 0.7) : undefined;
    const areaMax  = areaRef > 0 ? Math.round(areaRef * 1.3) : undefined;
    const precoMin = areaRef > 0 ? Math.round(areaRef * 1500) : undefined;
    const precoMax = areaRef > 0 ? Math.round(areaRef * 45000) : undefined;

    const enc = (s: string) => encodeURIComponent(s);

    // URLs de busca pré-geradas com valores reais
    const urlsApart = condNome
      ? [
          `OLX (condomínio):  https://www.olx.com.br/brasil?q=${enc(condNome)}`,
          `OLX (cond+bairro): https://www.olx.com.br/brasil?q=${enc(condNome + " " + bairro)}`,
          `OLX (bairro+tipo): https://www.olx.com.br/brasil?q=${enc(`apartamento ${quartosCnt ?? 2} quartos ${bairro} tenda`)}`,
        ]
      : [
          `OLX (bairro): https://www.olx.com.br/brasil?q=${enc(`apartamento ${quartosCnt ?? 2} quartos ${bairro} ${cidade}`)}`,
        ];

    const urlsCasa = [
      `OLX (rua):    https://www.olx.com.br/brasil?q=${enc(rua)}`,
      `OLX (bairro): https://www.olx.com.br/brasil?q=${enc(`casa venda ${bairro} ${cidade}`)}`,
    ];

    const estrategia = tipo === "apartamento"
      ? `ESTRATÉGIA — APARTAMENTO
Prioridade 1: mesmo condomínio/empreendimento → relevancia "endereco"
  Nome extraído da descrição: ${condNome || "⚠️ NÃO IDENTIFICADO — extraia manualmente da descrição abaixo"}
  ${condNome ? "" : `  Dica: procure por "RESIDENCIAL X", "CONDOMINIO X" ou "EMPREENDIMENTO X" na descrição`}

  URLs prontas para o built-in browser:
  ${urlsApart.map(u => "  " + u).join("\n")}

Prioridade 2: mesmo bairro + mesmo tipo + área similar → relevancia "bairro"
Prioridade 3: bairro vizinho como fallback → relevancia "regiao"`
      : `ESTRATÉGIA — CASA
Prioridade 1: mesma rua → relevancia "endereco"
  Rua: ${rua}

  URLs prontas para o built-in browser:
  ${urlsCasa.map(u => "  " + u).join("\n")}

Prioridade 2: mesmo bairro + mesmo tipo → relevancia "bairro"
Prioridade 3: bairro vizinho como fallback → relevancia "regiao"`;

    return `Faça uma busca manual de comparáveis de mercado para o laudo abaixo e submeta via PUT.

══════════════════════════════════════════════
LAUDO #${laudo.numero ?? laudo._id}  (ID: ${laudo._id})
══════════════════════════════════════════════
Tipo:         ${tipo}
Endereço:     ${endereco}
Bairro:       ${bairro}
Cidade/UF:    ${cidade} / ${estado}
Área útil:    ${fmtM(areaUtil)}  |  Área total: ${fmtM(areaTotal)}
Quartos:      ${quartosCnt ?? "—"}
Leilão:       ${fmtR(precoLeil)}
Avaliação Cx: ${fmtR(precoAvalN)}
Descrição:    ${descricao}

══════════════════════════════════════════════
${estrategia}

══════════════════════════════════════════════
CRITÉRIOS DE QUALIDADE
══════════════════════════════════════════════
✓ Tipo: ${tipo} para VENDA (não aluguel)
✓ Área: entre ${fmtM(areaMin)} e ${fmtM(areaMax)} (±30% de ${fmtM(areaRef || undefined)})
✓ Preço: entre ${fmtR(precoMin)} e ${fmtR(precoMax)} (R$ 1.500 a R$ 45.000/m²)
✓ URL direta do anúncio individual (não página de listagem/categoria)
✗ Descartar: sem preço, preço absurdo, páginas de portal sem imóvel específico
Meta: 4–8 comparáveis de qualidade, priorizando os mais próximos e similares

══════════════════════════════════════════════
STATUS DOS PORTAIS (built-in browser do Claude)
══════════════════════════════════════════════
✅ OLX (olx.com.br) — sem login, melhor para MCMV/Tenda/CDHU
✅ VivaReal (vivareal.com.br) — funciona, menos resultados populares
✅ Imovelweb (imovelweb.com.br) — funciona
⚠️ ZAP (zapimoveis.com.br) — navigate + get_page_text ok; javascript_tool bloqueado
⚠️ QuintoAndar — funciona, mas filtro de bairro por URL não funciona
❌ Mercado Livre — redireciona para login; pular
❌ OLX no Chrome extension — bloqueado; usar SEMPRE o built-in browser

Como obter imagemUrl no OLX:
  1. Navegue até o anúncio → leia o HTML com read_page ou get_page_text
  2. Pegue a URL da primeira imagem principal (geralmente https://img.olx.com.br/...)
  3. OU: clique botão direito na foto → "Copiar endereço da imagem"

fonte por portal (string exata): "OLX" | "ZAP Imóveis" | "VivaReal" | "Imovelweb" | "QuintoAndar" | "Loft"

══════════════════════════════════════════════
SUBMIT — após coletar todos os anúncios
══════════════════════════════════════════════
# Preferido (dev server local):
curl -s -X PUT "http://localhost:3001/api/admin/laudos/${laudo._id}/mercado" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: admin_token=%40Acesso00" \\
  -d '{"anuncios": [...]}'

# Alternativa (produção, se dev server não estiver rodando):
curl -s -X PUT "https://www.buscaleiloescaixa.com.br/api/admin/laudos/${laudo._id}/mercado" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: admin_token=%40Acesso00" \\
  -d '{"anuncios": [...]}'

Formato de cada objeto no array "anuncios":
{
  "titulo":     "Nome do anúncio como aparece no portal",
  "url":        "https://url-direta-do-anuncio-individual",
  "fonte":      "OLX",
  "preco":      250000,
  "area":       43,
  "quartos":    2,
  "imagemUrl":  "https://img.olx.com.br/...",
  "relevancia": "endereco"
}

relevancia:
  "endereco" = mesmo condomínio / mesma rua exata
  "bairro"   = mesmo bairro
  "regiao"   = bairro vizinho ou cidade

⚠️ Se usar localhost: verificar se o dev server está rodando (npm run dev --prefix web)
`;
  }

  async function copiarPrompt() {
    try {
      await navigator.clipboard.writeText(gerarPrompt());
      setPromptCopiado(true);
      setTimeout(() => setPromptCopiado(false), 2500);
    } catch {
      // fallback: seleciona texto
    }
  }

  const temDados = dados && dados.anuncios.length > 0;
  const stats    = dados?.stats;
  const anuncios = dados?.anuncios ?? [];
  const visiveis = expandido ? anuncios : anuncios.slice(0, 5);

  // Calcula desconto em relação à mediana de mercado
  const medianaStr = stats ? fmtBRL(stats.mediana) : null;
  const descontoMercado = stats && precoLeilao
    ? Math.round(((stats.mediana - precoLeilao) / stats.mediana) * 100)
    : null;

  const RELEVANCIA_LABEL: Record<AnuncioComparavel["relevancia"], { text: string; bg: string; color: string }> = {
    endereco: { text: "Mesmo endereço", bg: "#DCFCE7", color: "#166534" },
    bairro:   { text: "Bairro",         bg: "#DBEAFE", color: "#1E40AF" },
    regiao:   { text: "Região",         bg: "#F3F4F6", color: "#6B7280" },
  };

  if (!temDados && !canEdit) return null;

  return (
    <div style={{ background: "#fff", border: "1px solid #CBD9E3", borderRadius: 12, padding: "16px 24px", marginBottom: 20 }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11 }}>📊</span>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#01304D" }}>Avaliação de mercado</h2>
          {dados?.buscadoEm && (
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>
              · atualizado {new Date(dados.buscadoEm).toLocaleDateString("pt-BR")}
            </span>
          )}
          {dados?.source === "manual" && (
            <span style={{ fontSize: 10, fontWeight: 600, background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A", borderRadius: 4, padding: "1px 6px" }}>
              Manual
            </span>
          )}
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={copiarPrompt}
              title="Copia um prompt detalhado para fazer a busca manual aqui no Claude Code"
              style={{ background: promptCopiado ? "#D1FAE5" : "#F3F4F6", color: promptCopiado ? "#065F46" : "#374151", border: "1px solid #D1D5DB", borderRadius: 6, padding: "5px 12px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {promptCopiado ? "✓ Copiado!" : "📋 Copiar prompt"}
            </button>
            <button
              onClick={() => buscar()}
              disabled={buscando}
              style={{ background: "#01304D", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
            >
              {buscando ? "Buscando…" : temDados ? "Atualizar" : "Buscar comparáveis"}
            </button>
          </div>
        )}
      </div>

      {erro && <p style={{ margin: "0 0 10px", fontSize: 12, color: "#991B1B" }}>⚠️ {erro}</p>}
      {buscando && (
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#6B7280", textAlign: "center" }}>
          Consultando portais imobiliários… (pode levar ~15s)
        </p>
      )}

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Mínimo",    val: fmtBRL(stats.min) },
            { label: "Mediana",   val: medianaStr ?? "—", destaque: true },
            { label: "Máximo",    val: fmtBRL(stats.max) },
            ...(stats.precoM2 ? [{ label: "Preço/m² médio", val: fmtBRL(stats.precoM2) }] : []),
            ...(precoAval      ? [{ label: "Avaliação Caixa", val: fmtBRL(precoAval) }] : []),
          ].map(({ label, val, destaque }) => (
            <div key={label} style={{ background: "#F4F9FC", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
              <p style={{ margin: "0 0 3px", fontSize: 11, color: "#6B7280" }}>{label}</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: destaque ? "#01304D" : "#374151" }}>{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Banner de desconto */}
      {descontoMercado != null && descontoMercado > 0 && precoLeilao && (
        <div style={{ background: "#DCFCE7", border: "1px solid #86EFAC", borderRadius: 8, padding: "10px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#166534", letterSpacing: 0.5 }}>IMÓVEL NO LEILÃO</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#166534" }}>
              {fmtBRL(precoLeilao)}{area ? ` · ${fmtBRL(Math.round(precoLeilao / area))}/m²` : ""}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 11, color: "#166534" }}>desconto vs. mercado</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#166534" }}>−{descontoMercado}%</p>
          </div>
        </div>
      )}

      {/* Lista de comparáveis */}
      {temDados && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
            {anuncios.length} anúncio{anuncios.length !== 1 ? "s" : ""} encontrado{anuncios.length !== 1 ? "s"  : ""}
          </p>
          {visiveis.map((a, i) => {
            const rel = RELEVANCIA_LABEL[a.relevancia];
            const idade = a.dataPublicacao ? idadeAnuncio(a.dataPublicacao) : null;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i < visiveis.length - 1 ? "1px solid #F3F4F6" : "none", gap: 10, flexWrap: "wrap" }}>
                {/* Thumbnail */}
                <div style={{ flexShrink: 0, width: 64, height: 48, borderRadius: 6, overflow: "hidden", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {a.imagemUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.imagemUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${new URL(a.url).hostname}&sz=32`}
                      alt=""
                      style={{ width: 24, height: 24, opacity: 0.4 }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: "1px 7px", borderRadius: 20, background: rel.bg, color: rel.color }}>{rel.text}</span>
                    {idade && (
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: idade.cor }}>· {idade.label}</span>
                    )}
                    <span style={{ fontSize: 10.5, color: "#9CA3AF" }}>{a.fonte}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.titulo}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {a.preco && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#01304D", whiteSpace: "nowrap" }}>{fmtBRL(a.preco)}</span>
                  )}
                  <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#2563EB", textDecoration: "none", whiteSpace: "nowrap" }}>
                    Ver ↗
                  </a>
                </div>
              </div>
            );
          })}
          {anuncios.length > 5 && (
            <button
              onClick={() => setExpandido(!expandido)}
              style={{ marginTop: 8, background: "none", border: "none", color: "#2563EB", fontSize: 12, cursor: "pointer", padding: 0 }}
            >
              {expandido ? "▲ Mostrar menos" : `▼ Ver mais ${anuncios.length - 5} anúncios`}
            </button>
          )}
        </div>
      )}

      {/* Links de busca manual nos portais */}
      <div>
        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Buscar manualmente nos portais
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PORTAIS.map(({ label, domain }) => (
            <a
              key={domain}
              href={linkPortal(domain)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", border: "1px solid #CBD9E3", borderRadius: 6, fontSize: 11.5, color: "#374151", textDecoration: "none", background: "#F9FAFB" }}
            >
              {label} ↗
            </a>
          ))}
        </div>
      </div>

      {!temDados && !buscando && canEdit && (
        <div style={{ background: "#F9FAFB", border: "2px dashed #D1D5DB", borderRadius: 8, padding: "20px", textAlign: "center", color: "#9CA3AF", fontSize: 12.5, marginTop: 14 }}>
          Clique em &ldquo;Buscar comparáveis&rdquo; para encontrar imóveis similares nos portais.
        </div>
      )}
    </div>
  );
}

// ── Seção 6: Proximidades ─────────────────────────────────────────────────────
const CATEGORIA_ICON: Record<string, string> = {
  "Hospital":        "🏥",
  "Farmácia":        "💊",
  "UBS / Clínica":   "🩺",
  "Escola":          "🎒",
  "Universidade":    "🎓",
  "Creche":          "👶",
  "Supermercado":    "🛒",
  "Mercadinho":      "🛍️",
  "Padaria":         "🍞",
  "Shopping":        "🏬",
  "Banco":           "🏦",
  "Parque / Praça":  "🌳",
  "Academia":        "🏋️",
  "Metro / Trem":    "🚇",
  "Ponto de Ônibus": "🚌",
};

type Proximidade = { categoria: string; nome: string; distanciaM: number; count?: number };

function ovDistM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function ProximidadesImovel({ laudo, canEdit }: { laudo: Laudo; canEdit: boolean }) {
  const [buscando, setBuscando] = useState(false);
  const [dados, setDados] = useState<Proximidade[]>(laudo.proximidades ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const [raioKm, setRaioKm] = useState<string | null>(null);
  const [busyMsg, setBusyMsg] = useState("");

  async function buscarProximidades() {
    setBuscando(true);
    setErro(null);
    try {
      const imovel = laudo.imovelData as Record<string, string | undefined>;
      const endereco =
        laudo.localizacao?.enderecoMaps ??
        [imovel.cidade, imovel.uf ?? imovel.estado].filter(Boolean).join(", ");

      // Passo 1: geocodificar no servidor (retorna lat/lng)
      let lat: number, lng: number;
      if (laudo.localizacao?.lat && laudo.localizacao?.lng) {
        lat = laudo.localizacao.lat;
        lng = laudo.localizacao.lng;
      } else {
        const geoRes = await fetch(`/api/admin/laudos/${laudo._id}/localidade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endereco }),
        });
        const geoJson = await geoRes.json() as { lat?: number; lng?: number; error?: string };
        if (!geoRes.ok || !geoJson.lat) {
          setErro(geoJson.error ?? "Falha no geocoding");
          return;
        }
        lat = geoJson.lat;
        lng = geoJson.lng!;
      }

      // Passo 2: Nominatim structured search por categoria
      // Nominatim é gratuito, sem API key e não bloqueia por IP.
      // Rate limit: 1 req/s — fazemos as buscas em série com delay de 1.1s.
      // Se a região for esparsa (< 5 POIs encontrados), expande o raio automaticamente.
      const NOMINATIM = "https://nominatim.openstreetmap.org/search";
      const HEADERS = { "User-Agent": "BuscaLeiloesCaixa/1.0 (noreply@buscaleiloescaixa.com.br)" };

      const SEARCHES: { param: string; categoria: string; limit?: number }[] = [
        // Saúde
        { param: "amenity=hospital",        categoria: "Hospital" },
        { param: "amenity=pharmacy",        categoria: "Farmácia" },
        { param: "amenity=clinic",          categoria: "UBS / Clínica" },
        // Educação
        { param: "amenity=school",          categoria: "Escola" },
        { param: "amenity=university",      categoria: "Universidade" },
        { param: "amenity=kindergarten",    categoria: "Creche" },
        // Comércio
        { param: "amenity=supermarket",     categoria: "Supermercado" },
        { param: "shop=supermarket",        categoria: "Supermercado" },
        { param: "shop=convenience",        categoria: "Mercadinho" },
        { param: "shop=bakery",             categoria: "Padaria" },
        { param: "shop=mall",               categoria: "Shopping" },
        // Serviços
        { param: "amenity=bank",            categoria: "Banco" },
        // Lazer
        { param: "leisure=park",            categoria: "Parque / Praça" },
        { param: "leisure=fitness_centre",  categoria: "Academia" },
        // Transporte
        { param: "railway=station",         categoria: "Metro / Trem" },
        { param: "amenity=bus_stop",        categoria: "Ponto de Ônibus", limit: 50 },
      ];

      // Raios progressivos: expande se a região for esparsa
      const TIERS = [
        { delta: 0.011, maxDistM: 1500, label: "1,2 km" },
        { delta: 0.022, maxDistM: 3000, label: "2,5 km" },
        { delta: 0.044, maxDistM: 5000, label: "5 km"   },
      ];
      const MIN_POIS = 5; // expande se encontrar menos que isso (excluindo paradas)

      type NomResult = { display_name: string; lat: string; lon: string };
      let resultado: Proximidade[] = [];
      let raioFinal = TIERS[0].label;

      for (const tier of TIERS) {
        setBusyMsg(`Buscando arredores (raio ${tier.label})…`);
        const bbox = `${lng - tier.delta},${lat - tier.delta},${lng + tier.delta},${lat + tier.delta}`;
        const encontrados: Proximidade[] = [];
        const seenNames = new Set<string>();

        for (const { param, categoria, limit } of SEARCHES) {
          try {
            const url = `${NOMINATIM}?format=json&${param}&bounded=1&viewbox=${bbox}&countrycodes=br&limit=${limit ?? 5}&addressdetails=0&extratags=0`;
            const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
            if (r.ok) {
              const items = await r.json() as NomResult[];
              for (const item of items) {
                const nome = item.display_name.split(",")[0].trim();
                if (seenNames.has(nome)) continue;
                seenNames.add(nome);
                const distanciaM = ovDistM(lat, lng, parseFloat(item.lat), parseFloat(item.lon));
                if (distanciaM <= tier.maxDistM) encontrados.push({ categoria, nome, distanciaM });
              }
            }
          } catch { /* ignora timeout/erro numa categoria */ }
          // Rate limit Nominatim: 1 req/s
          await new Promise((res) => setTimeout(res, 1100));
        }

        // Ponto de Ônibus: agrega tudo em uma única entrada com contagem
        const ptsOnibus = encontrados.filter(p => p.categoria === "Ponto de Ônibus");
        const demais = encontrados.filter(p => p.categoria !== "Ponto de Ônibus");
        if (ptsOnibus.length > 0) {
          const maisProx = ptsOnibus.reduce((a, b) => a.distanciaM < b.distanciaM ? a : b);
          demais.push({ categoria: "Ponto de Ônibus", nome: `${ptsOnibus.length} paradas`, distanciaM: maisProx.distanciaM, count: ptsOnibus.length });
        }
        demais.sort((a, b) => a.distanciaM - b.distanciaM);

        raioFinal = tier.label;
        resultado = demais.slice(0, 30);

        // Região com POIs suficientes? Para de expandir.
        const totalSemOnibus = demais.filter(p => p.categoria !== "Ponto de Ônibus").length;
        if (totalSemOnibus >= MIN_POIS) break;

        // Última tentativa: usa o que tiver mesmo sendo pouco
        if (tier === TIERS[TIERS.length - 1]) break;
        setBusyMsg(`Região esparsa, expandindo raio…`);
      }

      setRaioKm(raioFinal);

      // Passo 3: salvar no servidor
      await fetch(`/api/admin/laudos/${laudo._id}/localidade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, proximidades: resultado }),
      });

      setDados(resultado);
    } catch (e) {
      setErro(`Erro: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBuscando(false);
    }
  }

  // Agrupa por categoria
  const grupos: Record<string, typeof dados> = {};
  for (const p of dados) {
    if (!grupos[p.categoria]) grupos[p.categoria] = [];
    grupos[p.categoria].push(p);
  }

  const temDados = dados.length > 0;

  if (!temDados && !canEdit) return null;

  return (
    <div style={{ background: "#fff", border: "1px solid #CBD9E3", borderRadius: 12, padding: "16px 24px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11 }}>🗺️</span>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#01304D" }}>O que há nas proximidades</h2>
        </div>
        {canEdit && (
          <button
            onClick={buscarProximidades}
            disabled={buscando}
            style={{ background: "#01304D", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
          >
            {buscando ? "Buscando…" : temDados ? "Atualizar" : "Buscar proximidades"}
          </button>
        )}
      </div>

      {erro && <p style={{ margin: "0 0 10px", fontSize: 12, color: "#991B1B" }}>⚠️ {erro}</p>}

      {temDados && raioKm && (
        <p style={{ margin: "0 0 10px", fontSize: 11, color: "#9CA3AF", textAlign: "right" }}>
          Raio de busca: {raioKm}
        </p>
      )}

      {temDados ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {Object.entries(grupos).map(([cat, itens]) => (
            <div key={cat} style={{ background: "#F4F9FC", borderRadius: 8, padding: "10px 14px" }}>
              <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#01304D" }}>
                {CATEGORIA_ICON[cat] ?? "📌"} {cat}
              </p>
              {itens[0]?.count != null ? (
                <p style={{ margin: 0, fontSize: 11.5, color: "#374151" }}>
                  {itens[0].count} paradas encontradas
                  <span style={{ color: "#6B7280", fontWeight: 600 }}> · mais próxima: {itens[0].distanciaM < 1000 ? `${itens[0].distanciaM} m` : `${(itens[0].distanciaM / 1000).toFixed(1)} km`}</span>
                </p>
              ) : (
                <>
                  {itens.slice(0, 3).map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#374151", padding: "2px 0", borderBottom: i < Math.min(itens.length, 3) - 1 ? "1px solid #E5E7EB" : "none" }}>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{item.nome}</span>
                      <span style={{ flexShrink: 0, color: "#6B7280", fontWeight: 600 }}>
                        {item.distanciaM < 1000 ? `${item.distanciaM} m` : `${(item.distanciaM / 1000).toFixed(1)} km`}
                      </span>
                    </div>
                  ))}
                  {itens.length > 3 && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#9CA3AF" }}>+{itens.length - 3} outros</p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        !buscando && canEdit && (
          <div style={{ background: "#F9FAFB", border: "2px dashed #D1D5DB", borderRadius: 8, padding: "24px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 12.5 }}>
            Clique em &ldquo;Buscar proximidades&rdquo; para identificar o que há nos arredores do imóvel.
          </div>
        )
      )}

      {buscando && (
        <p style={{ margin: 0, fontSize: 12.5, color: "#6B7280", textAlign: "center", padding: "16px 0" }}>
          {busyMsg || "Buscando…"} (pode levar ~20s)
        </p>
      )}
    </div>
  );
}

// ── Seção: Análise Financeira ─────────────────────────────────────────────────
function AnaliseFinanceiraImovel({ laudo, canEdit }: { laudo: Laudo; canEdit: boolean }) {
  const imovel = laudo.imovelData as Record<string, unknown>;

  function initData(): AnaliseFinanceira {
    const s = laudo.analiseFinanceira ?? {};
    return {
      valorAvaliacao:     s.valorAvaliacao     ?? (Number(imovel.precoAval) || undefined),
      valorMercado:       s.valorMercado       ?? laudo.avaliacaoMercado?.stats?.mediana,
      arrematacao:        s.arrematacao        ?? (Number(imovel.preco) || 0),
      leiloeiroPerc:      s.leiloeiroPerc      ?? 5,
      escrituraPerc:      s.escrituraPerc      ?? 3,
      itbiPerc:           s.itbiPerc           ?? 2.5,
      registroPerc:       s.registroPerc       ?? 3,
      condominioPendente: s.condominioPendente ?? 0,
      iptu:               s.iptu               ?? 0,
      imissaoPosse:       s.imissaoPosse       ?? 3000,
      reforma:            s.reforma            ?? 20000,
      areaNaoAverbada:    s.areaNaoAverbada     ?? 0,
      contabilidade:      s.contabilidade      ?? 1500,
      anunciosPagos:      s.anunciosPagos      ?? 1000,
      mesesManutencao:    s.mesesManutencao    ?? 5,
      condominioMensal:   s.condominioMensal   ?? 0,
      energiaMensal:      s.energiaMensal      ?? 100,
      aguaMensal:         s.aguaMensal         ?? 100,
      valorVenda:         s.valorVenda         ?? laudo.avaliacaoMercado?.stats?.mediana,
      corretorPerc:       s.corretorPerc       ?? 8,
      irPerc:             s.irPerc             ?? 15,
      assessoriaPerc:     s.assessoriaPerc     ?? 50,
    };
  }

  const [a, setA] = useState<AnaliseFinanceira>(() => initData());
  const [editing, setEditing]  = useState(false);
  const [saving,  setSaving]   = useState(false);
  const [saved,   setSaved]    = useState(false);

  type NumKey = Exclude<keyof AnaliseFinanceira, "atualizadoEm">;
  const setF = (key: NumKey, val: number | undefined) =>
    setA(prev => ({ ...prev, [key]: val }));

  // ── Computed ─────────────────────────────────────────────────────────────
  const arr = a.arrematacao ?? 0;
  const vv  = a.valorVenda  ?? 0;
  const mes = a.mesesManutencao ?? 5;

  const leiloeiroFee = arr * ((a.leiloeiroPerc ?? 5)   / 100);
  const escrituraFee = arr * ((a.escrituraPerc ?? 3)   / 100);
  const itbiFee      = arr * ((a.itbiPerc      ?? 2.5) / 100);
  const registroFee  = arr * ((a.registroPerc  ?? 3)   / 100);

  const totalAquisicao =
    arr + leiloeiroFee + (a.condominioPendente ?? 0) + (a.iptu ?? 0) +
    escrituraFee + itbiFee + registroFee +
    (a.imissaoPosse ?? 0) + (a.reforma ?? 0) + (a.areaNaoAverbada ?? 0) +
    (a.contabilidade ?? 0) + (a.anunciosPagos ?? 0);

  const totalManutencao =
    ((a.condominioMensal ?? 0) + (a.energiaMensal ?? 0) + (a.aguaMensal ?? 0)) * mes;

  const totalDespesas = totalAquisicao + totalManutencao;
  const corretorFee   = vv * ((a.corretorPerc  ?? 8)  / 100);
  const saldoPosVenda = vv - totalDespesas - corretorFee;
  const irFee         = Math.max(0, saldoPosVenda) * ((a.irPerc ?? 15)         / 100);
  const saldoPosIR    = saldoPosVenda - irFee;
  const assessoriaFee = Math.max(0, saldoPosIR)   * ((a.assessoriaPerc ?? 50)  / 100);
  const lucroLiquido  = saldoPosIR - assessoriaFee;
  const roi           = totalDespesas > 0 ? (lucroLiquido / totalDespesas) * 100 : 0;

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/admin/laudos/${laudo._id}/financeiro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, atualizadoEm: new Date().toISOString() }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000); }
  }

  const brl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const ValInp = ({ k, step = 1 }: { k: NumKey; step?: number }) => (
    <input
      type="number" step={step}
      value={(a[k] as number | undefined) ?? ""}
      onChange={e => setF(k, e.target.value === "" ? 0 : Number(e.target.value))}
      style={{ width: 110, textAlign: "right", border: "1px solid #CBD9E3", borderRadius: 6, padding: "3px 8px", fontSize: 12.5, background: "#fff" }}
    />
  );

  const PctInp = ({ k }: { k: NumKey }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      ·{" "}
      <input
        type="number" step={0.1}
        value={(a[k] as number | undefined) ?? ""}
        onChange={e => setF(k, e.target.value === "" ? 0 : Number(e.target.value))}
        style={{ width: 44, border: "1px solid #CBD9E3", borderRadius: 4, padding: "2px 4px", fontSize: 11.5, background: "#fff", textAlign: "right" }}
      />
      <span style={{ fontSize: 11, color: "#6B7280" }}>%</span>
    </span>
  );

  const row = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #F3F4F6", gap: 8, fontSize: 12.5 };
  const totalRow = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", fontWeight: 700 as const, color: "#01304D", fontSize: 13, borderTop: "2px solid #CBD9E3", marginTop: 2 };
  const subRow = { ...row, borderBottom: "2px solid #CBD9E3", paddingBottom: 8 };
  const tbl = { background: "#FAFBFC", borderRadius: 8, padding: "2px 12px", marginBottom: 2 };

  const SecHdr = ({ title }: { title: string }) => (
    <div style={{ background: "#01304D", color: "#fff", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginTop: 14, marginBottom: 6 }}>
      {title}
    </div>
  );

  const roiColor = roi >= 20 ? "#166534" : roi >= 10 ? "#92400E" : "#991B1B";
  const roiBg    = roi >= 20 ? "#F0FDF4"  : roi >= 10 ? "#FEF3C7"  : "#FEE2E2";

  if (!canEdit && !laudo.analiseFinanceira) return null;

  return (
    <div style={{ background: "#fff", border: "1px solid #CBD9E3", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11 }}>💰</span>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#01304D" }}>Análise Financeira</h2>
          {saved && <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>✓ Salvo</span>}
        </div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)}
            style={{ fontSize: 12, fontWeight: 600, color: "#01304D", background: "#F4F9FC", border: "1px solid #CBD9E3", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}>
            ✏️ Editar
          </button>
        )}
        {editing && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "#01304D", border: "none", borderRadius: 8, padding: "6px 18px", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Salvando…" : "💾 Salvar"}
            </button>
            <button onClick={() => { setA(initData()); setEditing(false); }}
              style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Cards de referência */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 4 }}>
        {([
          ["Avaliação Caixa",  "valorAvaliacao"],
          ["Valor de Mercado", "valorMercado"],
          ["Lance Inicial",    "arrematacao"],
        ] as [string, NumKey][]).map(([label, k]) => (
          <div key={k} style={{ background: "#F4F9FC", borderRadius: 8, padding: "10px 12px" }}>
            <p style={{ margin: 0, fontSize: 11, color: "#6B7280" }}>{label}</p>
            {editing ? (
              <input type="number" step={100}
                value={(a[k] as number | undefined) ?? ""}
                onChange={e => setF(k, e.target.value === "" ? undefined : Number(e.target.value))}
                style={{ marginTop: 4, width: "100%", border: "1px solid #CBD9E3", borderRadius: 6, padding: "3px 8px", fontSize: 13, fontWeight: 600, boxSizing: "border-box", background: "#fff" }}
              />
            ) : (
              <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#01304D" }}>
                {(a[k] as number | undefined) != null ? brl(a[k] as number) : "—"}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── DESPESAS AQUISIÇÃO ── */}
      <SecHdr title="DESPESAS AQUISIÇÃO" />
      <div style={tbl}>
        <div style={row}>
          <span style={{ color: "#374151", fontWeight: 500 }}>Arrematação</span>
          <span style={{ fontWeight: 600 }}>{brl(arr)}</span>
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
            Leiloeiro {editing ? <PctInp k="leiloeiroPerc" /> : <span style={{ fontSize: 11 }}>· {a.leiloeiroPerc ?? 5}%</span>}
          </span>
          <span>{brl(leiloeiroFee)}</span>
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280" }}>Condomínio (pendente)</span>
          {editing ? <ValInp k="condominioPendente" /> : <span>{brl(a.condominioPendente ?? 0)}</span>}
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280" }}>IPTU</span>
          {editing ? <ValInp k="iptu" step={0.01} /> : <span>{brl(a.iptu ?? 0)}</span>}
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
            Escritura {editing ? <PctInp k="escrituraPerc" /> : <span style={{ fontSize: 11 }}>· {a.escrituraPerc ?? 3}%</span>}
          </span>
          <span>{brl(escrituraFee)}</span>
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
            ITBI {editing ? <PctInp k="itbiPerc" /> : <span style={{ fontSize: 11 }}>· {a.itbiPerc ?? 2.5}%</span>}
          </span>
          <span>{brl(itbiFee)}</span>
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
            Registro {editing ? <PctInp k="registroPerc" /> : <span style={{ fontSize: 11 }}>· {a.registroPerc ?? 3}%</span>}
          </span>
          <span>{brl(registroFee)}</span>
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280" }}>Imissão na Posse / Custas</span>
          {editing ? <ValInp k="imissaoPosse" /> : <span>{brl(a.imissaoPosse ?? 0)}</span>}
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280" }}>Reforma / Reparos</span>
          {editing ? <ValInp k="reforma" /> : <span>{brl(a.reforma ?? 0)}</span>}
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280" }}>Área não averbada</span>
          {editing ? <ValInp k="areaNaoAverbada" /> : <span>{brl(a.areaNaoAverbada ?? 0)}</span>}
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280" }}>Contabilidade</span>
          {editing ? <ValInp k="contabilidade" /> : <span>{brl(a.contabilidade ?? 0)}</span>}
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280" }}>Anúncios Pagos</span>
          {editing ? <ValInp k="anunciosPagos" /> : <span>{brl(a.anunciosPagos ?? 0)}</span>}
        </div>
        <div style={totalRow}>
          <span>TOTAL AQUISIÇÃO</span>
          <span>{brl(totalAquisicao)}</span>
        </div>
      </div>

      {/* ── DESPESAS MANUTENÇÃO ── */}
      <SecHdr title={`DESPESAS MANUTENÇÃO · ${mes} ${mes === 1 ? "mês" : "meses"}`} />
      {editing && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 12.5 }}>
          <span style={{ color: "#6B7280" }}>Meses:</span>
          <input type="number" min={1} max={36} step={1} value={a.mesesManutencao ?? 5}
            onChange={e => setF("mesesManutencao", Number(e.target.value))}
            style={{ width: 60, border: "1px solid #CBD9E3", borderRadius: 6, padding: "3px 8px", fontSize: 12.5, background: "#fff" }}
          />
        </div>
      )}
      <div style={tbl}>
        <div style={row}>
          <span style={{ color: "#6B7280" }}>Condomínio</span>
          {editing
            ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><ValInp k="condominioMensal" /><span style={{ fontSize: 11, color: "#9CA3AF" }}>/mês</span></span>
            : <span>{brl((a.condominioMensal ?? 0) * mes)}</span>}
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280" }}>Energia</span>
          {editing
            ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><ValInp k="energiaMensal" /><span style={{ fontSize: 11, color: "#9CA3AF" }}>/mês</span></span>
            : <span>{brl((a.energiaMensal ?? 0) * mes)}</span>}
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280" }}>Água</span>
          {editing
            ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><ValInp k="aguaMensal" /><span style={{ fontSize: 11, color: "#9CA3AF" }}>/mês</span></span>
            : <span>{brl((a.aguaMensal ?? 0) * mes)}</span>}
        </div>
        <div style={totalRow}>
          <span>TOTAL MANUTENÇÃO</span>
          <span>{brl(totalManutencao)}</span>
        </div>
      </div>

      {/* Total Despesas */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#01304D", color: "#fff", borderRadius: 8, marginTop: 10, fontWeight: 700, fontSize: 13.5 }}>
        <span>TOTAL DESPESAS</span>
        <span>{brl(totalDespesas)}</span>
      </div>

      {/* ── VENDA ── */}
      <SecHdr title="VENDA" />
      <div style={tbl}>
        <div style={row}>
          <span style={{ color: "#6B7280" }}>Valor da Venda</span>
          {editing ? <ValInp k="valorVenda" step={1000} /> : <span style={{ fontWeight: 600 }}>{brl(vv)}</span>}
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
            Corretor {editing ? <PctInp k="corretorPerc" /> : <span style={{ fontSize: 11 }}>· {a.corretorPerc ?? 8}%</span>}
          </span>
          <span style={{ color: "#b91c1c" }}>−{brl(corretorFee)}</span>
        </div>
        <div style={subRow}>
          <span style={{ fontWeight: 600, color: "#374151" }}>Saldo Pós Venda</span>
          <span style={{ fontWeight: 600 }}>{brl(saldoPosVenda)}</span>
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
            IR {editing ? <PctInp k="irPerc" /> : <span style={{ fontSize: 11 }}>· {a.irPerc ?? 15}%</span>}
          </span>
          <span style={{ color: "#b91c1c" }}>−{brl(irFee)}</span>
        </div>
        <div style={subRow}>
          <span style={{ fontWeight: 600, color: "#374151" }}>Saldo Pós IR</span>
          <span style={{ fontWeight: 600 }}>{brl(saldoPosIR)}</span>
        </div>
        <div style={row}>
          <span style={{ color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
            Assessoria {editing ? <PctInp k="assessoriaPerc" /> : <span style={{ fontSize: 11 }}>· {a.assessoriaPerc ?? 50}%</span>}
          </span>
          <span style={{ color: "#b91c1c" }}>−{brl(assessoriaFee)}</span>
        </div>
      </div>

      {/* ROI */}
      <div style={{ background: roiBg, border: `1px solid ${roiColor}20`, borderRadius: 10, padding: "14px 18px", marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: roiColor, letterSpacing: 0.8, textTransform: "uppercase" }}>Lucro Líquido Operação</p>
          <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: roiColor }}>{brl(lucroLiquido)}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: 10, color: roiColor, fontWeight: 600 }}>ROI sobre investimento</p>
          <p style={{ margin: "2px 0 0", fontSize: 28, fontWeight: 800, color: roiColor, lineHeight: 1 }}>{roi.toFixed(2)}%</p>
        </div>
      </div>

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

      {/* ── LINKS DO IMÓVEL ── */}
      <LinksImovel laudo={laudo} />

      {/* ── SCREENSHOT CAIXA ── */}
      <ScreenshotCaixa laudo={laudo} canEdit={canEdit} />

      {/* ── FOTOS ── */}
      <FotosImovel laudo={laudo} canEdit={canEdit} />

      {/* ── MAPA ── */}
      <MapaImovel laudo={laudo} analise={analise} canEdit={canEdit} />

      {/* ── PROXIMIDADES ── */}
      <ProximidadesImovel laudo={laudo} canEdit={canEdit} />

      {/* ── AVALIAÇÃO DE MERCADO ── */}
      <AvaliacaoMercadoImovel laudo={laudo} canEdit={canEdit} />

      {/* ── ANÁLISE FINANCEIRA ── */}
      <AnaliseFinanceiraImovel laudo={laudo} canEdit={canEdit} />

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
