"use client";

import { useState, useMemo } from "react";
import type {
  Corretor, StatusRelacionamento, TipoPessoa,
  Assessoramento, ExclusividadeStatus, CidadeCobertura,
} from "@/lib/corretores";
import _TODAS_CIDADES from "@/public/cidades.json";
const TODAS_CIDADES = _TODAS_CIDADES as Record<string, string[]>;

const ESTADOS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const STATUS_LABELS: Record<StatusRelacionamento, string> = {
  sem_resposta:       "Sem resposta",
  em_negociacao:      "Em negociação",
  aguardando_retorno: "Aguardando retorno",
  parceiro_fechado:   "Parceiro fechado",
  recusou:            "Recusou",
};


// ── Cities modal ─────────────────────────────────────────────────

function CidadesModal({
  corretor, cidadesOcupadas, onClose, onSaved,
}: {
  corretor: Corretor;
  cidadesOcupadas: Set<string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [cidades, setCidades] = useState<CidadeCobertura[]>(corretor.cidades_cobertura ?? []);
  const [ufSel, setUfSel] = useState(corretor.estado || "SP");
  const [cidadeSel, setCidadeSel] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);

  const opcoesCidades = TODAS_CIDADES[ufSel] ?? [];

  function addCidade() {
    if (!cidadeSel) return;
    const jaNeste = cidades.some((c) => c.uf === ufSel && c.cidade === cidadeSel);
    if (jaNeste) { setMsg({ tipo: "erro", texto: "Cidade já adicionada a este parceiro." }); return; }
    const jaOutro = cidadesOcupadas.has(`${ufSel}|${cidadeSel}`);
    if (jaOutro) { setMsg({ tipo: "erro", texto: `${cidadeSel} já está atribuída a outro parceiro.` }); return; }
    setCidades((prev) => [
      ...prev,
      { uf: ufSel, cidade: cidadeSel, na_base_caixa: true, adicionada_em: new Date().toISOString() },
    ]);
    setCidadeSel("");
    setMsg(null);
  }

  function removeCidade(uf: string, cidade: string) {
    setCidades((prev) => prev.filter((c) => !(c.uf === uf && c.cidade === cidade)));
    setMsg(null);
  }

  async function salvar() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/corretores/${corretor._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cidades_cobertura: cidades }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { onSaved(); onClose(); }
    else setMsg({ tipo: "erro", texto: data.error ?? "Erro ao salvar." });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-800">{corretor.nome}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Cidades de cobertura exclusiva</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {/* Adicionar cidade */}
          <div className="flex gap-2 mb-3">
            <select
              value={ufSel}
              onChange={(e) => { setUfSel(e.target.value); setCidadeSel(""); setMsg(null); }}
              className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
            >
              {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
            <select
              value={cidadeSel}
              onChange={(e) => { setCidadeSel(e.target.value); setMsg(null); }}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione a cidade...</option>
              {opcoesCidades.map((c) => {
                const ocupada = cidadesOcupadas.has(`${ufSel}|${c}`);
                const jaNeste = cidades.some((x) => x.uf === ufSel && x.cidade === c);
                return (
                  <option key={c} value={c} disabled={ocupada || jaNeste}>
                    {c}{ocupada ? " — já atribuída" : jaNeste ? " — já adicionada" : ""}
                  </option>
                );
              })}
            </select>
            <button
              onClick={addCidade}
              disabled={!cidadeSel || cidadesOcupadas.has(`${ufSel}|${cidadeSel}`)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium"
            >
              + Add
            </button>
          </div>

          {msg && (
            <p className={`text-xs mb-3 ${msg.tipo === "erro" ? "text-red-600" : "text-green-600"}`}>
              {msg.texto}
            </p>
          )}

          {/* Lista de cidades */}
          {cidades.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma cidade cadastrada.</p>
          ) : (
            <div className="space-y-1">
              {cidades.map((c) => (
                <div key={`${c.uf}-${c.cidade}`} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-700">
                    <span className="font-mono text-xs text-gray-400 mr-2">{c.uf}</span>
                    {c.cidade}
                  </span>
                  <button
                    onClick={() => removeCidade(c.uf, c.cidade)}
                    className="text-xs text-red-500 hover:text-red-700 ml-2"
                  >
                    remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
          >
            {saving ? "Salvando..." : "Salvar cidades"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Novo parceiro form ────────────────────────────────────────────

function FormNovoParceiro({ onSuccess }: { onSuccess: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({
    nome: "",
    creci: "",
    estado: "SP",
    email: "",
    whatsapp: "",
    tipo_pessoa: "fisica" as TipoPessoa,
    assessoramento: "digital_fisico" as Assessoramento,
    nota_caixa: "",
    status_relacionamento: "sem_resposta" as StatusRelacionamento,
    exclusividade: "em_analise" as ExclusividadeStatus,
    observacoes_internas: "",
    origem: "direto",
    id_legado: "",
    // public profile fields (optional at this stage)
    categoria: "credenciado_caixa",
    cidade: "",
    bio: "",
    aprovado: false,
  });

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setErro("");
    setEnviando(true);
    const res = await fetch("/api/admin/corretores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        nota_caixa: form.nota_caixa ? Number(form.nota_caixa) : undefined,
        id_legado: form.id_legado ? Number(form.id_legado) : undefined,
        especialidades: [],
        cidades_cobertura: [],
      }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) { setErro(data.error || "Erro ao salvar."); return; }
    onSuccess();
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      {/* Linha 1 — identificação */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome / Razão Social *</label>
          <input required value={form.nome} onChange={(e) => set("nome", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
          <select value={form.tipo_pessoa} onChange={(e) => set("tipo_pessoa", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="fisica">PF — Autônomo</option>
            <option value="juridica">PJ — Imobiliária</option>
          </select>
        </div>
      </div>

      {/* Linha 2 — CRECI + UF */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">CRECI</label>
          <input value={form.creci} onChange={(e) => set("creci", e.target.value)}
            placeholder="Ex: 7742-F"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">UF do CRECI *</label>
          <select required value={form.estado} onChange={(e) => set("estado", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nota CAIXA (1–4)</label>
          <select value={form.nota_caixa} onChange={(e) => set("nota_caixa", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— não informado</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
      </div>

      {/* Linha 3 — contato */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">E-mail *</label>
          <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp</label>
          <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)}
            placeholder="82-99999-9999"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Linha 4 — assessoramento + pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Assessoramento CAIXA</label>
          <select value={form.assessoramento} onChange={(e) => set("assessoramento", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="digital_fisico">Digital + Físico</option>
            <option value="fisico">Físico</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status relacionamento</label>
          <select value={form.status_relacionamento} onChange={(e) => set("status_relacionamento", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="sem_resposta">Sem resposta</option>
            <option value="em_negociacao">Em negociação</option>
            <option value="aguardando_retorno">Aguardando retorno</option>
            <option value="parceiro_fechado">Parceiro fechado</option>
            <option value="recusou">Recusou</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Exclusividade</label>
          <select value={form.exclusividade} onChange={(e) => set("exclusividade", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="em_analise">Em análise</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
      </div>

      {/* Linha 5 — origem + id_legado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Origem</label>
          <input value={form.origem} onChange={(e) => set("origem", e.target.value)}
            placeholder="ex: email_campanha_jan2024"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ID planilha (migração)</label>
          <input value={form.id_legado} onChange={(e) => set("id_legado", e.target.value)}
            placeholder="Ex: 42"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Observações */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Observações internas</label>
        <textarea rows={2} value={form.observacoes_internas} onChange={(e) => set("observacoes_internas", e.target.value)}
          placeholder="Anotações internas sobre o parceiro..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      {/* Aprovado (visível no site) */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.aprovado} onChange={(e) => set("aprovado", e.target.checked)}
          className="w-4 h-4 rounded" />
        <span className="text-sm text-gray-700">Publicar perfil no site agora</span>
      </label>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
        As <strong>cidades de cobertura</strong> são configuradas após o cadastro — clique em <strong>Cidades</strong> na linha do parceiro na tabela abaixo.
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <div>
        <button type="submit" disabled={enviando}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors">
          {enviando ? "Salvando..." : "Cadastrar parceiro"}
        </button>
      </div>
    </form>
  );
}

// ── Filters ───────────────────────────────────────────────────────

const FILTER_OPTS: Array<{ key: StatusRelacionamento | "todos"; label: string }> = [
  { key: "todos",             label: "Todos" },
  { key: "sem_resposta",      label: "Sem resposta" },
  { key: "em_negociacao",     label: "Em negociação" },
  { key: "aguardando_retorno",label: "Aguardando retorno" },
  { key: "parceiro_fechado",  label: "Parceiro fechado" },
  { key: "recusou",           label: "Recusou" },
];

// ── Main component ────────────────────────────────────────────────

export default function AdminParceirosCRM({
  corretores,
  loading,
  onRefresh,
}: {
  corretores: Corretor[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [filtro, setFiltro] = useState<StatusRelacionamento | "todos">("todos");
  const [showForm, setShowForm] = useState(false);
  const [cadastroMsg, setCadastroMsg] = useState("");
  const [cidadesModal, setCidadesModal] = useState<Corretor | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [vinculandoId, setVinculandoId] = useState<string | null>(null);
  const [vinculandoEmail, setVinculandoEmail] = useState("");
  const [vinculandoMsg, setVinculandoMsg] = useState<Record<string, string>>({});

  // Filtros adicionais
  const [buscaNome, setBuscaNome] = useState("");
  const [filtroUF, setFiltroUF] = useState("todas");
  const [filtroExclusividade, setFiltroExclusividade] = useState("todas");
  const [filtroCidades, setFiltroCidades] = useState("todas");
  const [filtroConta, setFiltroConta] = useState("todas");

  async function vincular(id: string, email: string) {
    const res = await fetch(`/api/admin/corretores/${id}/vincular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok) {
      setVinculandoMsg((prev) => ({ ...prev, [id]: `✓ ${data.userName}` }));
      setVinculandoId(null);
      setVinculandoEmail("");
      onRefresh();
    } else {
      setVinculandoMsg((prev) => ({ ...prev, [id]: data.error }));
    }
  }

  async function desvincular(id: string) {
    if (!confirm("Remover vínculo com usuário?")) return;
    await fetch(`/api/admin/corretores/${id}/vincular`, { method: "DELETE" });
    onRefresh();
  }

  async function updateField(id: string, field: string, value: string | boolean | number) {
    setUpdatingStatus(id);
    await fetch(`/api/admin/corretores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setUpdatingStatus(null);
    onRefresh();
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"?`)) return;
    await fetch(`/api/admin/corretores/${id}`, { method: "DELETE" });
    onRefresh();
  }

  const filtrados = useMemo(() => {
    return corretores.filter((c) => {
      if (filtro !== "todos" && (c.status_relacionamento ?? "sem_resposta") !== filtro) return false;
      if (buscaNome && !c.nome.toLowerCase().includes(buscaNome.toLowerCase()) && !(c.creci ?? "").toLowerCase().includes(buscaNome.toLowerCase())) return false;
      if (filtroUF !== "todas" && c.estado !== filtroUF) return false;
      if (filtroExclusividade !== "todas" && (c.exclusividade ?? "em_analise") !== filtroExclusividade) return false;
      if (filtroCidades === "com" && !(c.cidades_cobertura?.length)) return false;
      if (filtroCidades === "sem" && (c.cidades_cobertura?.length ?? 0) > 0) return false;
      if (filtroConta === "vinculado" && !c.userId) return false;
      if (filtroConta === "nao_vinculado" && c.userId) return false;
      return true;
    });
  }, [corretores, filtro, buscaNome, filtroUF, filtroExclusividade, filtroCidades, filtroConta]);

  // Cidades já atribuídas a OUTROS parceiros (para bloquear duplicidade no modal)
  const cidadesOcupadas = useMemo(() => {
    const set = new Set<string>();
    for (const c of corretores) {
      if (c._id === cidadesModal?._id) continue;
      for (const cc of c.cidades_cobertura ?? []) {
        set.add(`${cc.uf}|${cc.cidade}`);
      }
    }
    return set;
  }, [corretores, cidadesModal]);

  // counts per status
  const counts = corretores.reduce<Record<string, number>>((acc, c) => {
    const s = c.status_relacionamento ?? "sem_resposta";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const parceiros_ativos = corretores.filter((c) => c.status_relacionamento === "parceiro_fechado").length;
  const em_negociacao    = corretores.filter((c) => c.status_relacionamento === "em_negociacao" || c.status_relacionamento === "aguardando_retorno").length;

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">{corretores.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total parceiros</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{parceiros_ativos}</p>
          <p className="text-xs text-green-600 mt-0.5">Parceiros fechados</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{em_negociacao}</p>
          <p className="text-xs text-amber-600 mt-0.5">Em negociação</p>
        </div>
      </div>

      {/* Form */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Cadastrar novo parceiro</h2>
          <button
            onClick={() => { setShowForm((v) => !v); setCadastroMsg(""); }}
            className="text-sm text-blue-600 hover:underline"
          >
            {showForm ? "Fechar" : "+ Novo"}
          </button>
        </div>
        {cadastroMsg && <p className="text-sm text-green-600 mb-3">{cadastroMsg}</p>}
        {showForm && (
          <div className="bg-gray-50 border rounded-xl p-5">
            <FormNovoParceiro onSuccess={() => {
              setShowForm(false);
              setCadastroMsg("✓ Parceiro cadastrado com sucesso.");
              onRefresh();
            }} />
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-gray-50 border rounded-xl p-4 mb-4 space-y-3">
        {/* Linha 1 — busca + UF */}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={buscaNome}
            onChange={(e) => setBuscaNome(e.target.value)}
            placeholder="Buscar por nome ou CRECI..."
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
          <select
            value={filtroUF}
            onChange={(e) => setFiltroUF(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Todos os estados</option>
            {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
          <select
            value={filtroExclusividade}
            onChange={(e) => setFiltroExclusividade(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Qualquer exclusividade</option>
            <option value="em_analise">Em análise</option>
            <option value="sim">Exclusiva</option>
            <option value="nao">Sem exclusividade</option>
          </select>
          <select
            value={filtroCidades}
            onChange={(e) => setFiltroCidades(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Todas as cidades</option>
            <option value="com">Com cidades cadastradas</option>
            <option value="sem">Sem cidades</option>
          </select>
          <select
            value={filtroConta}
            onChange={(e) => setFiltroConta(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Conta vinculada ou não</option>
            <option value="vinculado">Conta vinculada</option>
            <option value="nao_vinculado">Sem conta vinculada</option>
          </select>
          {(buscaNome || filtroUF !== "todas" || filtroExclusividade !== "todas" || filtroCidades !== "todas" || filtroConta !== "todas" || filtro !== "todos") && (
            <button
              onClick={() => { setBuscaNome(""); setFiltroUF("todas"); setFiltroExclusividade("todas"); setFiltroCidades("todas"); setFiltroConta("todas"); setFiltro("todos"); }}
              className="text-xs text-gray-500 hover:text-red-500 border rounded-lg px-3 py-1.5 bg-white transition-colors"
            >
              Limpar filtros
            </button>
          )}
          <span className="text-xs text-gray-400 self-center ml-auto">
            {filtrados.length} de {corretores.length} parceiro{corretores.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Linha 2 — status pills */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTS.map(({ key, label }) => {
            const count = key === "todos" ? corretores.length : (counts[key] ?? 0);
            return (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                  filtro === key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }`}
              >
                {label} {count > 0 && <span className="opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-400 text-center py-10">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p className="text-gray-400 text-center py-10">Nenhum parceiro nessa categoria.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">UF / CRECI</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Exclusividade</th>
                <th className="px-4 py-3 font-medium">Cidades</th>
                <th className="px-4 py-3 font-medium">Público</th>
                <th className="px-4 py-3 font-medium">Conta</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c._id} className="border-b last:border-0 hover:bg-gray-50">
                  {/* Nome */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{c.nome}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {c.tipo_pessoa === "juridica"
                        ? <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0 rounded">PJ</span>
                        : <span className="text-xs bg-sky-100 text-sky-600 px-1.5 py-0 rounded">PF</span>
                      }
                      {c.assessoramento === "digital_fisico"
                        ? <span className="text-xs text-gray-400">Digital+Físico</span>
                        : c.assessoramento === "fisico"
                          ? <span className="text-xs text-gray-400">Físico</span>
                          : null
                      }
                      {c.nota_caixa && (
                        <span className="text-xs text-amber-600 font-medium">★{c.nota_caixa}</span>
                      )}
                    </div>
                    {c.observacoes_internas && (
                      <p className="text-xs text-gray-400 truncate max-w-[180px] mt-0.5" title={c.observacoes_internas}>
                        {c.observacoes_internas}
                      </p>
                    )}
                  </td>

                  {/* UF / CRECI */}
                  <td className="px-4 py-3 text-gray-600">
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{c.estado}</span>
                    {c.creci && <p className="text-xs text-gray-400 mt-0.5">{c.creci}</p>}
                  </td>

                  {/* Contato */}
                  <td className="px-4 py-3">
                    {c.email && <p className="text-xs text-gray-600 truncate max-w-[150px]">{c.email}</p>}
                    {c.whatsapp && <p className="text-xs text-gray-400">{c.whatsapp}</p>}
                  </td>

                  {/* Status — quick edit */}
                  <td className="px-4 py-3">
                    <select
                      value={c.status_relacionamento ?? "sem_resposta"}
                      disabled={updatingStatus === c._id}
                      onChange={(e) => updateField(c._id, "status_relacionamento", e.target.value)}
                      className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      <option value="sem_resposta">Sem resposta</option>
                      <option value="em_negociacao">Em negociação</option>
                      <option value="aguardando_retorno">Aguardando retorno</option>
                      <option value="parceiro_fechado">Parceiro fechado</option>
                      <option value="recusou">Recusou</option>
                    </select>
                  </td>

                  {/* Exclusividade — quick edit */}
                  <td className="px-4 py-3">
                    <select
                      value={c.exclusividade ?? "em_analise"}
                      disabled={updatingStatus === c._id}
                      onChange={(e) => updateField(c._id, "exclusividade", e.target.value)}
                      className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      <option value="em_analise">Em análise</option>
                      <option value="sim">Exclusiva</option>
                      <option value="nao">Sem exclus.</option>
                    </select>
                  </td>

                  {/* Cidades */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setCidadesModal(c)}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      {(c.cidades_cobertura?.length ?? 0) === 0
                        ? "+ Adicionar"
                        : `${c.cidades_cobertura!.length} cidad${c.cidades_cobertura!.length === 1 ? "e" : "es"}`
                      }
                    </button>
                    {c.cidades_cobertura && c.cidades_cobertura.length > 0 && (
                      <p className="text-xs text-gray-400 truncate max-w-[100px]" title={c.cidades_cobertura.map((x) => x.cidade).join(", ")}>
                        {c.cidades_cobertura.map((x) => x.cidade).join(", ")}
                      </p>
                    )}
                  </td>

                  {/* Aprovado toggle */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateField(c._id, "aprovado", !c.aprovado)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                        c.aprovado
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {c.aprovado ? "Publicado" : "Rascunho"}
                    </button>
                  </td>

                  {/* Vincular conta */}
                  <td className="px-4 py-3 min-w-[160px]">
                    {c.userId ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-green-600 font-medium">✓ Vinculado</span>
                        <button
                          onClick={() => desvincular(c._id)}
                          className="text-xs text-red-500 hover:underline text-left"
                        >
                          Desvincular
                        </button>
                      </div>
                    ) : vinculandoId === c._id ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="email"
                          value={vinculandoEmail}
                          onChange={(e) => setVinculandoEmail(e.target.value)}
                          placeholder="email do usuário"
                          className="text-xs border rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
                          onKeyDown={(e) => { if (e.key === "Enter") vincular(c._id, vinculandoEmail); }}
                        />
                        {vinculandoMsg[c._id] && (
                          <p className={`text-xs ${vinculandoMsg[c._id].startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
                            {vinculandoMsg[c._id]}
                          </p>
                        )}
                        <div className="flex gap-1">
                          <button
                            onClick={() => vincular(c._id, vinculandoEmail)}
                            className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700"
                          >
                            Vincular
                          </button>
                          <button
                            onClick={() => { setVinculandoId(null); setVinculandoEmail(""); setVinculandoMsg((p) => ({ ...p, [c._id]: "" })); }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setVinculandoId(c._id); setVinculandoEmail(""); }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        + Vincular conta
                      </button>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {c.aprovado && c.slug && (
                        <a href={`/corretores/${c.slug}`} target="_blank"
                          className="text-xs text-blue-600 hover:underline">
                          Ver →
                        </a>
                      )}
                      <button
                        onClick={() => excluir(c._id, c.nome)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cities modal */}
      {cidadesModal && (
        <CidadesModal
          corretor={cidadesModal}
          cidadesOcupadas={cidadesOcupadas}
          onClose={() => setCidadesModal(null)}
          onSaved={() => { onRefresh(); setCidadesModal(null); }}
        />
      )}
    </>
  );
}
