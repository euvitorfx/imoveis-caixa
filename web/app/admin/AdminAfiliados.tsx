"use client";

import { useEffect, useState } from "react";
import type { Afiliado, ComissaoAfiliado } from "@/lib/afiliados";

const BASE = "https://www.buscaleiloescaixa.com.br";

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function AdminAfiliados() {
  const [afiliados, setAfiliados] = useState<Afiliado[]>([]);
  const [comissoes, setComissoes] = useState<ComissaoAfiliado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    nome: "",
    email: "",
    codigo: "",
    percentualComissao: "",
    userId: "",
  });

  async function load() {
    setLoading(true);
    const [ra, rc] = await Promise.all([
      fetch("/api/admin/afiliados"),
      fetch("/api/admin/afiliados/comissoes"),
    ]);
    const { afiliados: a } = await ra.json();
    const { comissoes: c } = await rc.json();
    setAfiliados(a ?? []);
    setComissoes(c ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/admin/afiliados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        percentualComissao: Number(form.percentualComissao),
        userId: form.userId.trim() || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsg(data.error ?? "Erro ao criar afiliado");
    } else {
      setMsg("Afiliado criado com sucesso!");
      setShowForm(false);
      setForm({ nome: "", email: "", codigo: "", percentualComissao: "", userId: "" });
      load();
    }
  }

  async function toggleAtivo(af: Afiliado) {
    await fetch(`/api/admin/afiliados/${af._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !af.ativo }),
    });
    setAfiliados((prev) => prev.map((a) => a._id === af._id ? { ...a, ativo: !a.ativo } : a));
  }

  async function marcarPago(comissao: ComissaoAfiliado) {
    await fetch("/api/admin/afiliados/comissoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: comissao._id, status: "pago" }),
    });
    setComissoes((prev) =>
      prev.map((c) => c._id === comissao._id ? { ...c, status: "pago", pagoEm: new Date().toISOString() } : c)
    );
  }

  const totalPendente = comissoes
    .filter((c) => c.status === "pendente")
    .reduce((s, c) => s + c.valorAfiliado, 0);

  const totalPago = comissoes
    .filter((c) => c.status === "pago")
    .reduce((s, c) => s + c.valorAfiliado, 0);

  if (loading) return <p className="text-gray-400 text-center py-10">Carregando...</p>;

  return (
    <div className="space-y-8">

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-400 mb-1">Afiliados ativos</p>
          <p className="text-2xl font-bold" style={{ color: "#01304D" }}>
            {afiliados.filter((a) => a.ativo).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-400 mb-1">Comissões pendentes</p>
          <p className="text-2xl font-bold text-amber-600">{fmtMoeda(totalPendente)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-400 mb-1">Total pago</p>
          <p className="text-2xl font-bold text-green-600">{fmtMoeda(totalPago)}</p>
        </div>
      </div>

      {/* Afiliados */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Afiliados</h2>
          <button
            onClick={() => { setShowForm(!showForm); setMsg(""); }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Novo afiliado
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-5 mb-4 space-y-4">
            <h3 className="font-semibold text-gray-800 text-sm">Cadastrar afiliado</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nome *</label>
                <input
                  required
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="João Silva"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">E-mail *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="joao@email.com"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Código único *</label>
                <input
                  required
                  value={form.codigo}
                  onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="JOAO123"
                  pattern="[A-Z0-9]+"
                />
                <p className="text-xs text-gray-400 mt-0.5">Link gerado: {BASE}/?ref={form.codigo || "CODIGO"}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">% de comissão *</label>
                <input
                  required
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={form.percentualComissao}
                  onChange={(e) => setForm((f) => ({ ...f, percentualComissao: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="10"
                />
                <p className="text-xs text-gray-400 mt-0.5">% da comissão BLC que vai para o afiliado</p>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">ID do usuário BLC (opcional)</label>
                <input
                  value={form.userId}
                  onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="ObjectId do usuário no MongoDB"
                />
                <p className="text-xs text-gray-400 mt-0.5">Se preenchido, o influencer verá o dashboard no /perfil</p>
              </div>
            </div>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
              >
                {saving ? "Salvando..." : "Criar afiliado"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {msg && !showForm && (
          <p className="text-sm text-green-600 mb-3">{msg}</p>
        )}

        {afiliados.length === 0 ? (
          <p className="text-gray-400 text-center py-8 bg-white rounded-xl shadow">Nenhum afiliado cadastrado.</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Afiliado</th>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">%</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Cadastrado</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {afiliados.map((af) => (
                  <tr key={af._id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{af.nome}</p>
                      <p className="text-xs text-gray-400">{af.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{af.codigo}</code>
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">/?ref={af.codigo}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: "#01304D" }}>
                      {af.percentualComissao}%
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAtivo(af)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                          af.ativo
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {af.ativo ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmtData(af.criadoEm)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${BASE}/?ref=${af.codigo}`);
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Copiar link
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comissões */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Comissões</h2>
        {comissoes.length === 0 ? (
          <p className="text-gray-400 text-center py-8 bg-white rounded-xl shadow">Nenhuma comissão gerada ainda.</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Afiliado ID</th>
                  <th className="px-4 py-3 font-medium">Processo</th>
                  <th className="px-4 py-3 font-medium">Valor BLC</th>
                  <th className="px-4 py-3 font-medium">Comissão</th>
                  <th className="px-4 py-3 font-medium">%</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {comissoes.map((c) => {
                  const af = afiliados.find((a) => a._id === c.afiliadoId);
                  return (
                    <tr key={c._id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{af?.nome ?? "—"}</p>
                        <p className="text-xs text-gray-400">{af?.codigo}</p>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-gray-500">{c.processoId.slice(-8)}</code>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{fmtMoeda(c.valorComissaoBLC)}</td>
                      <td className="px-4 py-3 font-semibold text-amber-600">{fmtMoeda(c.valorAfiliado)}</td>
                      <td className="px-4 py-3 text-gray-500">{c.percentual}%</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          c.status === "pago"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {c.status === "pago" ? "Pago" : "Pendente"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmtData(c.criadoEm)}</td>
                      <td className="px-4 py-3">
                        {c.status === "pendente" && (
                          <button
                            onClick={() => marcarPago(c)}
                            className="text-xs text-green-600 hover:underline font-medium"
                          >
                            Marcar pago
                          </button>
                        )}
                        {c.status === "pago" && c.pagoEm && (
                          <span className="text-xs text-gray-400">{fmtData(c.pagoEm)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
