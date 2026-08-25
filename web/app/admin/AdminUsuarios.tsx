"use client";

import { useState, useMemo } from "react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

type Preferencias = { brasil: boolean; estados: string[]; cidades: string[] };

type UserRow = {
  _id: string;
  name: string;
  email: string;
  telefone?: string;
  plano: string;
  criadoEm?: string;
  preferencias?: Preferencias;
  totalFavoritos?: number;
  totalAnalises?: number;
  totalSessoes?: number;
  totalPageviews?: number;
  ultimoAcesso?: string;
  isAfiliado?: boolean;
  afiliadoId?: string | null;
  isCorretor?: boolean;
  corretorId?: string | null;
};

type UserStats = {
  total: number;
  premium: number;
  gratuito: number;
  comTelefone: number;
  recentes: UserRow[];
};

type ModalMode = "novo" | "editar" | null;

function Modal({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className={`bg-white rounded-2xl shadow-2xl w-full my-4 ${wide ? "max-w-xl" : "max-w-md"}`}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function SenhaModal({ senha, onClose }: { senha: string; onClose: () => void }) {
  const [copiado, setCopiado] = useState(false);
  function copiar() {
    navigator.clipboard.writeText(senha);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 pt-5 pb-4 border-b">
          <h3 className="font-semibold text-gray-800">Senha temporária gerada</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">Envie esta senha para o usuário. Ela não será exibida novamente.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-100 rounded-lg px-4 py-3 text-base font-mono tracking-widest text-gray-800 select-all">
              {senha}
            </code>
            <button onClick={copiar} className="px-3 py-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium transition-colors whitespace-nowrap">
              {copiado ? "✓" : "Copiar"}
            </button>
          </div>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-800 hover:bg-gray-900 text-white transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

const INPUT = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const LABEL = "block text-xs font-medium text-gray-600 mb-1";
const FINPUT = "w-full border-0 border-b border-gray-200 bg-gray-50 px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 placeholder:text-gray-300";

export default function AdminUsuarios({
  stats,
  loading,
  onRefresh,
}: {
  stats: UserStats | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [modal, setModal] = useState<ModalMode>(null);
  const [editando, setEditando] = useState<UserRow | null>(null);
  const [senhaTemp, setSenhaTemp] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  // Mini-form de afiliado dentro do modal de edição
  const [showAfiliadoForm, setShowAfiliadoForm] = useState(false);
  const [afiliadoForm, setAfiliadoForm] = useState({ codigo: "", percentualComissao: "" });
  const [savingAfiliado, setSavingAfiliado] = useState(false);
  const [erroAfiliado, setErroAfiliado] = useState("");

  // Mini-form de corretor dentro do modal de edição
  const [showCorretorForm, setShowCorretorForm] = useState(false);
  const [corretorForm, setCorretorForm] = useState({ creci: "", estado: "", cidade: "", categoria: "corretor_geral" });
  const [savingCorretor, setSavingCorretor] = useState(false);
  const [erroCorretor, setErroCorretor] = useState("");

  const [form, setForm] = useState({ nome: "", email: "", telefone: "", plano: "gratuito", senha: "", estados: [] as string[], cidades: [] as string[] });

  // Filtros por coluna
  const [filtros, setFiltros] = useState({ nome: "", email: "", telefone: "", plano: "", data: "" });
  const temFiltro = Object.values(filtros).some(Boolean);

  function setF(campo: string, valor: string) {
    setFiltros((p) => ({ ...p, [campo]: valor }));
  }

  function limparFiltros() {
    setFiltros({ nome: "", email: "", telefone: "", plano: "", data: "" });
  }

  const filtrados = useMemo(() => {
    if (!stats) return [];
    return stats.recentes.filter((u) => {
      const nome = filtros.nome.toLowerCase();
      const email = filtros.email.toLowerCase();
      const tel = filtros.telefone.toLowerCase();
      const data = filtros.data.toLowerCase();
      if (nome && !(u.name ?? "").toLowerCase().includes(nome)) return false;
      if (email && !u.email.toLowerCase().includes(email)) return false;
      if (tel && !(u.telefone ?? "").toLowerCase().includes(tel)) return false;
      if (filtros.plano && u.plano !== filtros.plano) return false;
      if (data) {
        const d = u.criadoEm ? new Date(u.criadoEm).toLocaleDateString("pt-BR") : "";
        if (!d.includes(data)) return false;
      }
      return true;
    });
  }, [stats, filtros]);

  function set(field: string, value: string) { setForm((p) => ({ ...p, [field]: value })); }
  function abrirNovo() { setForm({ nome: "", email: "", telefone: "", plano: "gratuito", senha: "", estados: [], cidades: [] }); setErro(""); setModal("novo"); }
  function abrirEditar(u: UserRow) {
    setEditando(u);
    setForm({ nome: u.name ?? "", email: u.email, telefone: u.telefone ?? "", plano: u.plano, senha: "", estados: u.preferencias?.estados ?? [], cidades: u.preferencias?.cidades ?? [] });
    setErro("");
    setShowAfiliadoForm(false);
    setAfiliadoForm({ codigo: (u.name ?? "").split(" ")[0].toUpperCase().replace(/[^A-Z0-9]/g, ""), percentualComissao: "" });
    setErroAfiliado("");
    setShowCorretorForm(false);
    setCorretorForm({ creci: "", estado: "", cidade: "", categoria: "corretor_geral" });
    setErroCorretor("");
    setModal("editar");
  }
  function removerEstado(uf: string) { setForm((p) => ({ ...p, estados: p.estados.filter((e) => e !== uf) })); }
  function removerCidade(c: string) { setForm((p) => ({ ...p, cidades: p.cidades.filter((x) => x !== c) })); }
  function fecharModal() {
    setModal(null); setEditando(null); setErro("");
    setShowAfiliadoForm(false); setErroAfiliado("");
    setShowCorretorForm(false); setErroCorretor("");
  }

  async function criarCorretor() {
    if (!editando) return;
    setSavingCorretor(true);
    setErroCorretor("");
    const res = await fetch("/api/admin/corretores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: editando.name,
        email: editando.email,
        creci: corretorForm.creci,
        estado: corretorForm.estado,
        cidade: corretorForm.cidade || "",
        categoria: corretorForm.categoria,
        bio: "",
        especialidades: [],
        aprovado: true,
        userId: editando._id,
      }),
    });
    const data = await res.json();
    setSavingCorretor(false);
    if (!res.ok) {
      setErroCorretor(data.error ?? "Erro ao criar corretor parceiro");
      return;
    }
    setEditando((prev) => prev ? { ...prev, isCorretor: true, corretorId: data.id } : prev);
    setShowCorretorForm(false);
    onRefresh();
  }

  async function criarAfiliado() {
    if (!editando) return;
    setSavingAfiliado(true);
    setErroAfiliado("");
    const res = await fetch("/api/admin/afiliados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: editando.name,
        email: editando.email,
        codigo: afiliadoForm.codigo.toUpperCase(),
        percentualComissao: Number(afiliadoForm.percentualComissao),
        userId: editando._id,
      }),
    });
    const data = await res.json();
    setSavingAfiliado(false);
    if (!res.ok) {
      setErroAfiliado(data.error ?? "Erro ao criar afiliado");
      return;
    }
    // Atualiza o editando localmente para refletir o novo status
    setEditando((prev) => prev ? { ...prev, isAfiliado: true } : prev);
    setShowAfiliadoForm(false);
    onRefresh();
  }

  async function salvar() {
    setSaving(true); setErro("");
    if (modal === "novo") {
      const senhaDigitada = form.senha;
      const res = await fetch("/api/admin/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: form.nome, email: form.email, telefone: form.telefone, plano: form.plano, senha: senhaDigitada }) });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Erro ao criar usuário."); setSaving(false); return; }
      setSaving(false); fecharModal(); onRefresh();
      setSenhaTemp(senhaDigitada); // exibe a senha para o admin copiar e enviar ao usuário
      return;
    } else if (modal === "editar" && editando) {
      const res = await fetch(`/api/admin/usuarios/${editando._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: form.nome, email: form.email, telefone: form.telefone, plano: form.plano, preferencias: { brasil: false, estados: form.estados, cidades: form.cidades } }) });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Erro ao salvar."); setSaving(false); return; }
    }
    setSaving(false); fecharModal(); onRefresh();
  }

  async function excluir(u: UserRow) {
    if (!confirm(`Excluir permanentemente "${u.name}" (${u.email})?\n\nEsta ação não pode ser desfeita.`)) return;
    await fetch(`/api/admin/usuarios/${u._id}`, { method: "DELETE" });
    onRefresh();
  }

  async function resetarSenha(u: UserRow) {
    if (!confirm(`Gerar nova senha temporária para "${u.name}"?`)) return;
    const res = await fetch(`/api/admin/usuarios/${u._id}/reset-senha`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setSenhaTemp(data.senhaTemp);
  }

  function exportarCSV() {
    if (!stats) return;
    const rows = [
      ["#", "Nome", "E-mail", "Telefone", "Plano", "Cadastrado em"],
      ...filtrados.map((u, i) => [
        String(filtrados.length - i),
        u.name ?? "", u.email ?? "", u.telefone ?? "", u.plano ?? "",
        u.criadoEm ? new Date(u.criadoEm).toLocaleDateString("pt-BR") : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="text-gray-400 text-center py-10">Carregando...</p>;
  if (!stats) return <p className="text-gray-400 text-center py-10">Erro ao carregar dados.</p>;

  return (
    <>
      {senhaTemp && <SenhaModal senha={senhaTemp} onClose={() => setSenhaTemp(null)} />}

      {modal && (
        <Modal title={modal === "novo" ? "Novo usuário" : `Editar — ${editando?.name}`} onClose={fecharModal} wide={modal === "editar"}>
          <div className="space-y-3">
            <div><label className={LABEL}>Nome completo *</label><input value={form.nome} onChange={(e) => set("nome", e.target.value)} required className={INPUT} placeholder="Nome completo" /></div>
            <div><label className={LABEL}>E-mail *</label><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required className={INPUT} placeholder="email@exemplo.com" /></div>
            <div>
              <label className={LABEL}>Telefone / WhatsApp <span className="text-gray-400 font-normal">(opcional)</span></label>
              <PhoneInput
                international
                defaultCountry="BR"
                value={form.telefone || undefined}
                onChange={(v) => set("telefone", v ?? "")}
                className="phone-input-wrapper phone-input-perfil"
                placeholder="+55 (11) 99999-9999"
              />
            </div>
            <div><label className={LABEL}>Plano</label>
              <select value={form.plano} onChange={(e) => set("plano", e.target.value)} className={INPUT}>
                <option value="gratuito">Gratuito</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            {modal === "novo" && <div><label className={LABEL}>Senha *</label><input type="password" value={form.senha} onChange={(e) => set("senha", e.target.value)} required className={INPUT} placeholder="Mínimo 6 caracteres" /></div>}
            {modal === "editar" && (
              <>
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">Para redefinir a senha use o botão &ldquo;Reset senha&rdquo; na tabela.</p>

                {/* Estados de interesse */}
                <div>
                  <label className={LABEL}>Estados de interesse</label>
                  {form.estados.length === 0 ? (
                    <p className="text-xs text-gray-400 mt-1">Nenhum estado selecionado</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {form.estados.map((uf) => (
                        <span key={uf} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          {uf}
                          <button type="button" onClick={() => removerEstado(uf)} className="hover:text-red-500 leading-none ml-0.5">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cidades de interesse */}
                <div>
                  <label className={LABEL}>Cidades de interesse</label>
                  {form.cidades.length === 0 ? (
                    <p className="text-xs text-gray-400 mt-1">Nenhuma cidade selecionada</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-1 max-h-32 overflow-y-auto">
                      {form.cidades.map((cidade) => (
                        <span key={cidade} className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          {cidade}
                          <button type="button" onClick={() => removerCidade(cidade)} className="hover:text-red-500 leading-none ml-0.5">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Corretor Parceiro */}
                <div className="border-t border-gray-100 pt-3">
                  <p className={LABEL}>Corretor parceiro</p>
                  {editando?.isCorretor ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-1.5 rounded-full font-medium">
                        🏠 Corretor parceiro ativo
                      </span>
                      <a
                        href={`/admin?tab=corretores`}
                        className="text-xs text-gray-400 hover:underline"
                      >
                        Gerencie na aba Corretores
                      </a>
                    </div>
                  ) : (
                    <>
                      {!showCorretorForm ? (
                        <button
                          type="button"
                          onClick={() => setShowCorretorForm(true)}
                          className="mt-1 text-xs text-blue-600 hover:underline font-medium"
                        >
                          + Tornar corretor parceiro
                        </button>
                      ) : (
                        <div className="mt-2 space-y-2 bg-blue-50 rounded-xl p-3">
                          <p className="text-xs text-blue-700 font-medium mb-2">Cadastrar {editando?.name} como corretor parceiro</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className={LABEL}>CRECI *</label>
                              <input
                                value={corretorForm.creci}
                                onChange={(e) => setCorretorForm((p) => ({ ...p, creci: e.target.value }))}
                                className={INPUT}
                                placeholder="123456-F"
                              />
                            </div>
                            <div>
                              <label className={LABEL}>Estado *</label>
                              <select
                                value={corretorForm.estado}
                                onChange={(e) => setCorretorForm((p) => ({ ...p, estado: e.target.value }))}
                                className={INPUT}
                              >
                                <option value="">Selecione</option>
                                {["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"].map((uf) => (
                                  <option key={uf} value={uf}>{uf}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className={LABEL}>Cidade</label>
                              <input
                                value={corretorForm.cidade}
                                onChange={(e) => setCorretorForm((p) => ({ ...p, cidade: e.target.value }))}
                                className={INPUT}
                                placeholder="Opcional"
                              />
                            </div>
                            <div>
                              <label className={LABEL}>Categoria</label>
                              <select
                                value={corretorForm.categoria}
                                onChange={(e) => setCorretorForm((p) => ({ ...p, categoria: e.target.value }))}
                                className={INPUT}
                              >
                                <option value="corretor_geral">Corretor geral</option>
                                <option value="credenciado_caixa">Credenciado Caixa</option>
                              </select>
                            </div>
                          </div>
                          {erroCorretor && <p className="text-xs text-red-600">{erroCorretor}</p>}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={criarCorretor}
                              disabled={savingCorretor || !corretorForm.creci || !corretorForm.estado}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
                            >
                              {savingCorretor ? "Cadastrando..." : "Cadastrar como parceiro"}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowCorretorForm(false); setErroCorretor(""); }}
                              className="px-3 py-1.5 border rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Programa de Afiliados */}
                <div className="border-t border-gray-100 pt-3">
                  <p className={LABEL}>Programa de afiliados</p>
                  {editando?.isAfiliado ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-full font-medium">
                        🤝 Afiliado ativo
                      </span>
                      <span className="text-xs text-gray-400">Gerencie na aba Afiliados</span>
                    </div>
                  ) : (
                    <>
                      {!showAfiliadoForm ? (
                        <button
                          type="button"
                          onClick={() => setShowAfiliadoForm(true)}
                          className="mt-1 text-xs text-blue-600 hover:underline font-medium"
                        >
                          + Tornar afiliado
                        </button>
                      ) : (
                        <div className="mt-2 space-y-2 bg-blue-50 rounded-xl p-3">
                          <p className="text-xs text-blue-700 font-medium mb-2">Criar registro de afiliado para {editando?.name}</p>
                          <div>
                            <label className={LABEL}>Código único *</label>
                            <input
                              value={afiliadoForm.codigo}
                              onChange={(e) => setAfiliadoForm((p) => ({ ...p, codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                              className={INPUT + " font-mono"}
                              placeholder="EX: JOAO123"
                            />
                            <p className="text-xs text-gray-400 mt-0.5">Link: buscaleiloescaixa.com.br/?ref={afiliadoForm.codigo || "CODIGO"}</p>
                          </div>
                          <div>
                            <label className={LABEL}>% de comissão BLC *</label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              value={afiliadoForm.percentualComissao}
                              onChange={(e) => setAfiliadoForm((p) => ({ ...p, percentualComissao: e.target.value }))}
                              className={INPUT}
                              placeholder="10"
                            />
                          </div>
                          {erroAfiliado && <p className="text-xs text-red-600">{erroAfiliado}</p>}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={criarAfiliado}
                              disabled={savingAfiliado || !afiliadoForm.codigo || !afiliadoForm.percentualComissao}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
                            >
                              {savingAfiliado ? "Criando..." : "Criar afiliado"}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowAfiliadoForm(false); setErroAfiliado(""); }}
                              className="px-3 py-1.5 border rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
            {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={fecharModal} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={salvar} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors">
                {saving ? "Salvando..." : modal === "novo" ? "Criar usuário" : "Salvar alterações"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-1">Total cadastrados</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{stats.premium}</p>
          <p className="text-xs text-gray-500 mt-1">Premium ativos</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-gray-500">{stats.gratuito}</p>
          <p className="text-xs text-gray-500 mt-1">Plano gratuito</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{stats.comTelefone}</p>
          <p className="text-xs text-gray-500 mt-1">Com WhatsApp</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Usuários
          </h2>
          <span className="text-xs text-gray-400">
            {temFiltro ? `${filtrados.length} de ${stats.recentes.length}` : stats.recentes.length}{stats.recentes.length === 200 ? "+" : ""}
          </span>
          {temFiltro && (
            <button onClick={limparFiltros} className="text-xs text-red-500 hover:underline">
              limpar filtros
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={exportarCSV} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors">
            ↓ Exportar CSV
          </button>
          <button onClick={abrirNovo} className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            + Novo usuário
          </button>
        </div>
      </div>

      {/* Tabela */}
      {stats.recentes.length === 0 ? (
        <p className="text-gray-400 text-center py-10">Nenhum usuário cadastrado ainda.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {/* Cabeçalho */}
                <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide bg-gray-50">
                  <th className="px-4 py-3 font-medium w-10">#</th>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Telefone</th>
                  <th className="px-4 py-3 font-medium">Plano</th>
                  <th className="px-4 py-3 font-medium">Cadastrado</th>
                  <th className="px-4 py-3 font-medium text-center">♥ Fav</th>
                  <th className="px-4 py-3 font-medium text-center">📊 Plan</th>
                  <th className="px-4 py-3 font-medium">Último acesso</th>
                  <th className="px-4 py-3 font-medium text-center">Sessões</th>
                  <th className="px-4 py-3 font-medium text-center">Páginas</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
                {/* Linha de filtros */}
                <tr className="border-b bg-gray-50/60">
                  <td className="px-2 py-1.5"></td>
                  <td className="px-2 py-1.5">
                    <input value={filtros.nome} onChange={(e) => setF("nome", e.target.value)} className={FINPUT} placeholder="Buscar nome..." />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={filtros.email} onChange={(e) => setF("email", e.target.value)} className={FINPUT} placeholder="Buscar e-mail..." />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={filtros.telefone} onChange={(e) => setF("telefone", e.target.value)} className={FINPUT} placeholder="Buscar..." />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={filtros.plano} onChange={(e) => setF("plano", e.target.value)} className={FINPUT}>
                      <option value="">Todos</option>
                      <option value="gratuito">Gratuito</option>
                      <option value="premium">Premium</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={filtros.data} onChange={(e) => setF("data", e.target.value)} className={FINPUT} placeholder="dd/mm/aaaa" />
                  </td>
                  <td className="px-2 py-1.5"></td>
                  <td className="px-2 py-1.5"></td>
                  <td className="px-2 py-1.5"></td>
                  <td className="px-2 py-1.5"></td>
                  <td className="px-2 py-1.5"></td>
                  <td className="px-2 py-1.5"></td>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum resultado para os filtros aplicados.</td></tr>
                ) : filtrados.map((u, i) => (
                  <tr key={u._id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs tabular-nums">{filtrados.length - i}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{u.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{u.telefone || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.plano === "premium"
                          ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Premium</span>
                          : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Gratuito</span>
                        }
                        {u.isCorretor && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">🏠 Cor.</span>
                        )}
                        {u.isAfiliado && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">🤝 Afil.</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {u.criadoEm ? new Date(u.criadoEm).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(u.totalFavoritos ?? 0) > 0
                        ? <span className="text-xs font-semibold text-rose-600">{u.totalFavoritos}</span>
                        : <span className="text-gray-300 text-xs">0</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(u.totalAnalises ?? 0) > 0
                        ? <span className="text-xs font-semibold text-blue-600">{u.totalAnalises}</span>
                        : <span className="text-gray-300 text-xs">0</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {u.ultimoAcesso ? new Date(u.ultimoAcesso).toLocaleDateString("pt-BR") : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-xs tabular-nums text-gray-500">
                      {u.totalSessoes ?? <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-xs tabular-nums text-gray-500">
                      {u.totalPageviews ?? <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 justify-end items-center">
                        <button onClick={() => abrirEditar(u)} className="text-xs text-blue-600 hover:underline whitespace-nowrap">Editar</button>
                        <button onClick={() => resetarSenha(u)} className="text-xs text-amber-600 hover:underline whitespace-nowrap">Reset senha</button>
                        <button onClick={() => excluir(u)} className="text-xs text-red-500 hover:underline whitespace-nowrap">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
