"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { ProcessoClubeEnriquecido } from "@/lib/processos-clube";

const STATUS_LABELS: Record<string, string> = {
  aguardando_dados: "Aguardando dados",
  em_analise:       "Em análise",
  em_andamento:     "Em andamento",
  concluido:        "Concluído",
  cancelado:        "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  aguardando_dados: "text-amber-700 bg-amber-50",
  em_analise:       "text-blue-700 bg-blue-50",
  em_andamento:     "text-purple-700 bg-purple-50",
  concluido:        "text-green-700 bg-green-50",
  cancelado:        "text-gray-500 bg-gray-100",
};

// ── Autocomplete genérico ──────────────────────────────────────────

interface AutocompleteProps<T> {
  label: string;
  placeholder: string;
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
  onSelect: (item: T) => void;
  fetchUrl: (q: string) => string;
  renderItem: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
}

function Autocomplete<T>({
  label, placeholder, required, value, onChange, onSelect,
  fetchUrl, renderItem, getKey,
}: AutocompleteProps<T>) {
  const [results, setResults] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const buscar = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(fetchUrl(encodeURIComponent(q)));
      const data = await res.json();
      setResults(data);
      setOpen(data.length > 0);
      setLoading(false);
    }, 300);
  }, [fetchUrl]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-gray-400">*</span>}
      </label>
      <div className="relative">
        <input
          required={required}
          value={value}
          onChange={(e) => { onChange(e.target.value); buscar(e.target.value); }}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
        />
        {loading && (
          <span className="absolute right-2 top-2.5 text-xs text-gray-400 animate-pulse">...</span>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {results.map((item) => (
            <li
              key={getKey(item)}
              onMouseDown={(e) => { e.preventDefault(); onSelect(item); setOpen(false); setResults([]); }}
              className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0"
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Formulário novo processo ───────────────────────────────────────

function FormNovoProcesso({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    emailComprador:      "",
    creci:               "",
    numeroProcessoCaixa: "",
    imovelNumero:        "",
    imovelDescricao:     "",
    status:              "aguardando_dados",
  });
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMsg(null);
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setEnviando(true);
    setMsg(null);
    const res = await fetch("/api/admin/processos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setEnviando(false);
    if (res.ok) {
      setMsg({ tipo: "ok", texto: `Processo criado — Comprador: ${data.compradorNome} · Assessor: ${data.corretorNome}` });
      setForm({ emailComprador: "", creci: "", numeroProcessoCaixa: "", imovelNumero: "", imovelDescricao: "", status: "aguardando_dados" });
      onSuccess();
    } else {
      setMsg({ tipo: "erro", texto: data.error ?? "Erro ao criar processo." });
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Autocomplete<{ id: string; nome: string; email: string }>
          label="E-mail do comprador"
          placeholder="Digite nome ou e-mail..."
          required
          value={form.emailComprador}
          onChange={(v) => set("emailComprador", v)}
          onSelect={(u) => set("emailComprador", u.email)}
          fetchUrl={(q) => `/api/admin/busca/usuarios?q=${q}`}
          getKey={(u) => u.id}
          renderItem={(u) => (
            <div>
              <p className="font-medium text-gray-800 text-xs">{u.nome}</p>
              <p className="text-gray-400 text-xs">{u.email}</p>
            </div>
          )}
        />
        <Autocomplete<{ id: string; nome: string; creci: string; estado: string }>
          label="CRECI do assessor parceiro"
          placeholder="Digite CRECI ou nome..."
          required
          value={form.creci}
          onChange={(v) => set("creci", v.toUpperCase())}
          onSelect={(c) => set("creci", c.creci)}
          fetchUrl={(q) => `/api/admin/busca/corretores?q=${q}`}
          getKey={(c) => c.id}
          renderItem={(c) => (
            <div>
              <p className="font-medium text-gray-800 text-xs">{c.nome}</p>
              <p className="text-gray-400 text-xs">CRECI: {c.creci} · {c.estado}</p>
            </div>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Número do processo Caixa <span className="text-gray-400">*</span></label>
          <input
            required
            value={form.numeroProcessoCaixa}
            onChange={(e) => set("numeroProcessoCaixa", e.target.value)}
            placeholder="Ex: 12345678901234"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status inicial</label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <Autocomplete<{ id: string; numero: string; descricao: string; cidade: string; estado: string; tipo: string }>
        label="Imóvel"
        placeholder="Digite número, cidade ou tipo do imóvel... (opcional)"
        value={form.imovelNumero}
        onChange={(v) => { set("imovelNumero", v); set("imovelDescricao", ""); }}
        onSelect={(i) => { set("imovelNumero", i.numero); set("imovelDescricao", [i.tipo, i.cidade, i.estado].filter(Boolean).join(", ")); }}
        fetchUrl={(q) => `/api/admin/busca/imoveis?q=${q}`}
        getKey={(i) => i.id}
        renderItem={(i) => (
          <div>
            <p className="font-medium text-gray-800 text-xs font-mono">{i.numero}</p>
            <p className="text-gray-400 text-xs">{i.tipo} · {i.cidade} – {i.estado}</p>
          </div>
        )}
      />

      {msg && (
        <p className={`text-sm ${msg.tipo === "ok" ? "text-green-600" : "text-red-600"}`}>
          {msg.texto}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
      >
        {enviando ? "Criando..." : "Criar processo"}
      </button>
    </form>
  );
}

export default function AdminProcessos() {
  const [processos, setProcessos] = useState<ProcessoClubeEnriquecido[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/processos");
    if (res.ok) setProcessos(await res.json());
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch(`/api/admin/processos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(null);
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">

      {/* Cabeçalho + botão novo */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Processos Clube BLC
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{processos.length} total</span>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-sm font-medium px-4 py-1.5 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors"
          >
            {showForm ? "Fechar" : "+ Novo processo"}
          </button>
        </div>
      </div>

      {/* Formulário de novo processo */}
      {showForm && (
        <div className="bg-gray-50 border rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Abrir novo processo</p>
          <FormNovoProcesso onSuccess={() => { load(); }} />
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <p className="text-gray-400 text-center py-10">Carregando...</p>
      ) : processos.length === 0 ? (
        <p className="text-gray-400 text-center py-10">Nenhum processo registrado ainda.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Comprador</th>
                <th className="px-4 py-3 font-medium">Assessor</th>
                <th className="px-4 py-3 font-medium">Imóvel</th>
                <th className="px-4 py-3 font-medium">Processo Caixa</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {processos.map((p) => (
                <tr key={p._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{p.compradorNome ?? "—"}</p>
                    {p.compradorEmail && (
                      <p className="text-xs text-gray-400 truncate max-w-[160px]">{p.compradorEmail}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{p.corretorNome ?? "—"}</p>
                    {p.corretorCreci && (
                      <p className="text-xs text-gray-400">CRECI: {p.corretorCreci}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    {p.imovelDescricao && (
                      <p className="text-xs text-gray-700 font-medium truncate">{p.imovelDescricao}</p>
                    )}
                    {p.imovelNumero && (
                      <p className="text-xs font-mono text-gray-400">{p.imovelNumero}</p>
                    )}
                    {!p.imovelDescricao && !p.imovelNumero && (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {p.numeroProcessoCaixa}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.status}
                      disabled={updating === p._id}
                      onChange={(e) => updateStatus(p._id, e.target.value)}
                      className={`text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 font-medium ${STATUS_COLORS[p.status] ?? ""}`}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
