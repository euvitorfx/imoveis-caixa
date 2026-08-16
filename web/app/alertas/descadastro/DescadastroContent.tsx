"use client";

import { useSearchParams } from "next/navigation";

export default function DescadastroContent() {
  const params = useSearchParams();
  const ok = params.get("ok") === "1";
  const erro = params.get("erro");

  if (erro) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#f3f4f6" }}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Link inválido</h1>
          <p className="text-sm text-gray-500 mb-6">
            Este link de descadastro expirou ou é inválido.
            Para desativar os alertas, acesse suas preferências.
          </p>
          <a
            href="/perfil"
            className="inline-block px-6 py-3 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#01304D" }}
          >
            Ir para preferências
          </a>
        </div>
      </main>
    );
  }

  if (ok) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#f3f4f6" }}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "#01304D" }}>
            Alertas desativados
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Você não receberá mais e-mails de novos imóveis.
            Pode reativar os alertas a qualquer momento em preferências.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="/perfil"
              className="inline-block px-6 py-3 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#01304D" }}
            >
              Reativar alertas
            </a>
            <a
              href="/"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Voltar ao início
            </a>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
