"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [senha, setSenha]     = useState("");
  const [erro,  setErro]      = useState("");
  const [load,  setLoad]      = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoad(true);
    setErro("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    if (res.ok) {
      router.push("/admin");
    } else {
      setErro("Senha incorreta.");
      setLoad(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-800 mb-6 text-center">Painel Admin</h1>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            placeholder="Senha de acesso"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {erro && <p className="text-red-500 text-xs">{erro}</p>}
          <button
            type="submit"
            disabled={load || !senha}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            {load ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
