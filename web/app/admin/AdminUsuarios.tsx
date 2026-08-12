"use client";

import { useState } from "react";

type UserRow = {
  _id: string;
  name: string;
  email: string;
  telefone?: string;
  plano: string;
  criadoEm?: string;
};

type UserStats = {
  total: number;
  premium: number;
  gratuito: number;
  comTelefone: number;
  recentes: UserRow[];
};

type ModalMode = "novo" | "editar" | null;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
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
          <p className="text-sm text-gray-600">
            Envie esta senha para o usuário. Ela não será exibida novamente.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-100 rounded-lg px-4 py-3 text-base font-mono tracking-widest text-gray-800 select-all">
              {senha}
            </code>
            <button
              onClick={copiar}
              className="px-3 py-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium transition-colors whitespace-nowrap"
            >
              {copiado ? "✓" : "Copiar"}
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-800 hover:bg-gray-900 text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

const INPUT = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const LABEL = "block text-xs font-medium text-gray-600 mb-1";

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

  const [form, setForm] = useState({
    nome: "", email: "", telefone: "", plano: "gratuito", senha: "",
  });

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function abrirNovo() {
    setForm({ nome: "", email: "", telefone: "", plano: "gratuito", senha: "" });
    setErro("");
    setModal("novo");
  }

  function abrirEditar(u: UserRow) {
    setEditando(u);
    setForm({ nome: u.name ?? "", email: u.email, telefone: u.telefone ?? "", plano: u.plano, senha: "" });
    setErro("");
    setModal("editar");
  }

  function fecharModal() {
    setModal(null);
    setEditando(null);
    setErro("");
  }

  async function salvar() {
    setSaving(true);
    setErro("");

    if (modal === "novo") {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: form.nome, email: form.email, telefone: form.telefone, plano: form.plano, senha: form.senha }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Erro ao criar usuário."); setSaving(false); return; }
    } else if (modal === "editar" && editando) {
      const res = await fetch(`/api/admin/usuarios/${editando._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: form.nome, email: form.email, telefone: form.telefone, plano: form.plano }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Erro ao salvar."); setSaving(false); return; }
    }

    setSaving(false);
    fecharModal();
    onRefresh();
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
      ["Nome", "E-mail", "Telefone", "Plano", "Cadastrado em"],
      ...stats.recentes.map((u) => [
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
      {/* Modais */}
      {senhaTemp && <SenhaModal senha={senhaTemp} onClose={() => setSenhaTemp(null)} />}

      {modal && (
        <Modal
          title={modal === "novo" ? "Novo usuário" : `Editar — ${editando?.name}`}
          onClose={fecharModal}
        >
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Nome completo *</label>
              <input value={form.nome} onChange={(e) => set("nome", e.target.value)} required className={INPUT} placeholder="Nome completo" />
            </div>
            <div>
              <label className={LABEL}>E-mail *</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required className={INPUT} placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className={LABEL}>Telefone / WhatsApp <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} className={INPUT} placeholder="+55 11 99999-9999" />
            </div>
            <div>
              <label className={LABEL}>Plano</label>
              <select value={form.plano} onChange={(e) => set("plano", e.target.value)} className={INPUT}>
                <option value="gratuito">Gratuito</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            {modal === "novo" && (
              <div>
                <label className={LABEL}>Senha *</label>
                <input type="password" value={form.senha} onChange={(e) => set("senha", e.target.value)} required className={INPUT} placeholder="Mínimo 6 caracteres" />
              </div>
            )}
            {modal === "editar" && (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                Para redefinir a senha use o botão "Reset senha" na tabela.
              </p>
            )}
            {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={fecharModal} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
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
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Usuários ({stats.recentes.length}{stats.recentes.length === 200 ? "+" : ""})
        </h2>
        <div className="flex gap-2">
          <button onClick={exportarCSV}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors">
            ↓ Exportar CSV
          </button>
          <button onClick={abrirNovo}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
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
                <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide bg-gray-50">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Telefone</th>
                  <th className="px-4 py-3 font-medium">Plano</th>
                  <th className="px-4 py-3 font-medium">Cadastrado</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {stats.recentes.map((u) => (
                  <tr key={u._id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{u.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{u.telefone || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      {u.plano === "premium"
                        ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Premium</span>
                        : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Gratuito</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {u.criadoEm ? new Date(u.criadoEm).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 justify-end items-center">
                        <button onClick={() => abrirEditar(u)} className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                          Editar
                        </button>
                        <button onClick={() => resetarSenha(u)} className="text-xs text-amber-600 hover:underline whitespace-nowrap">
                          Reset senha
                        </button>
                        <button onClick={() => excluir(u)} className="text-xs text-red-500 hover:underline whitespace-nowrap">
                          Excluir
                        </button>
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
