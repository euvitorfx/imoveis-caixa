"use client";

import { useState } from "react";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      await fetch("/api/auth/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setEnviado(true);
    } catch {
      setErro("Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href="/"><img src="/logo.png" alt="Busca Leilões Caixa" className="h-16 mx-auto mb-4" /></a>
          <h1 className="text-2xl font-bold text-gray-800">Recuperar senha</h1>
          <p className="text-gray-500 text-sm mt-1">
            Lembrou?{" "}
            <a href="/login" className="font-medium hover:underline" style={{ color: "#01304D" }}>
              Voltar ao login
            </a>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {enviado ? (
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "#01304D" }}
              >
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Verifique seu e-mail</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Se houver uma conta com esse e-mail, você receberá as instruções para redefinir
                sua senha em breve. O link é válido por 1 hora.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-500 leading-relaxed">
                Informe o e-mail da sua conta e enviaremos um link para redefinir sua senha.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="seu@email.com"
                />
              </div>

              {erro && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "#01304D", color: "#fff" }}
              >
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
