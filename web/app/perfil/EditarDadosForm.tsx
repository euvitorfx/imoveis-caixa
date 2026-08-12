"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function EditarDadosForm({
  nomeAtual,
  telefoneAtual,
  obrigatorio,
}: {
  nomeAtual: string;
  telefoneAtual?: string;
  obrigatorio?: boolean;
}) {
  const [nome, setNome] = useState(nomeAtual);
  const [telefone, setTelefone] = useState(telefoneAtual ?? "");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const telefoneRef = useRef<HTMLInputElement>(null);
  const { update } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (obrigatorio) telefoneRef.current?.focus();
  }, [obrigatorio]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!telefone.trim()) {
      setMsg("Telefone é obrigatório.");
      telefoneRef.current?.focus();
      return;
    }
    setSalvando(true);
    setMsg("");
    const res = await fetch("/api/perfil/dados", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, telefone }),
    });
    setSalvando(false);
    if (res.ok) {
      await update(); // atualiza token JWT (temTelefone → true)
      setMsg("Dados salvos!");
      setTimeout(() => {
        setMsg("");
        if (obrigatorio) router.push("/");
        else router.refresh();
      }, 1000);
    } else {
      const d = await res.json();
      setMsg(d.error ?? "Erro ao salvar.");
    }
  }

  return (
    <form onSubmit={salvar} className="mt-4 pt-4 border-t border-gray-100 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dados pessoais</p>
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
        <label className="block text-xs text-gray-500 mb-1">
          Telefone / WhatsApp{" "}
          <span className="text-red-500">*</span>
        </label>
        <input
          ref={telefoneRef}
          type="tel"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(11) 99999-9999"
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${
            obrigatorio && !telefone ? "border-red-300 bg-red-50" : "border-gray-200"
          }`}
        />
        {obrigatorio && !telefone && (
          <p className="text-xs text-red-500 mt-1">Informe seu telefone para continuar usando o sistema.</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
        >
          {salvando ? "Salvando..." : "Salvar dados"}
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
