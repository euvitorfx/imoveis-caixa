"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditarDadosForm({
  nomeAtual,
  telefoneAtual,
}: {
  nomeAtual: string;
  telefoneAtual?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(nomeAtual);
  const [telefone, setTelefone] = useState(telefoneAtual ?? "");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMsg("");
    const res = await fetch("/api/perfil/dados", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, telefone }),
    });
    setSalvando(false);
    if (res.ok) {
      setMsg("Dados atualizados!");
      setTimeout(() => { setMsg(""); setAberto(false); router.refresh(); }, 1500);
    } else {
      const d = await res.json();
      setMsg(d.error ?? "Erro ao salvar.");
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="text-xs text-blue-600 hover:text-blue-800 transition-colors mt-2"
      >
        ✏️ Editar dados pessoais
      </button>
    );
  }

  return (
    <form onSubmit={salvar} className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Nome</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Telefone / WhatsApp</label>
        <input
          type="tel"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(11) 99999-9999"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => { setAberto(false); setNome(nomeAtual); setTelefone(telefoneAtual ?? ""); }}
          className="px-4 py-2 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        {msg && (
          <span className={`text-xs font-medium ${msg.includes("Erro") || msg.includes("obrigatório") ? "text-red-500" : "text-green-600"}`}>
            {msg}
          </span>
        )}
      </div>
    </form>
  );
}
