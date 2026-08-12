"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function ExcluirContaForm() {
  const [etapa, setEtapa] = useState<"idle" | "confirmar" | "excluindo">("idle");

  async function excluir() {
    setEtapa("excluindo");
    const res = await fetch("/api/perfil/conta", { method: "DELETE" });
    if (res.ok) {
      await signOut({ callbackUrl: "/" });
    } else {
      setEtapa("confirmar");
      alert("Erro ao excluir conta. Tente novamente.");
    }
  }

  if (etapa === "idle") {
    return (
      <button
        onClick={() => setEtapa("confirmar")}
        className="w-full py-3 rounded-xl text-sm font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
      >
        Excluir minha conta
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-red-500 text-lg shrink-0">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-red-700">Tem certeza que deseja excluir sua conta?</p>
          <p className="text-xs text-red-600 mt-0.5">
            Esta ação é <strong>irreversível</strong>. Todos os seus dados — favoritos, preferências e histórico — serão excluídos permanentemente.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={excluir}
          disabled={etapa === "excluindo"}
          className="flex-1 py-2 rounded-lg text-xs font-bold border border-red-400 text-red-700 bg-white hover:bg-red-100 disabled:opacity-60 transition-colors"
        >
          {etapa === "excluindo" ? "Excluindo..." : "Sim, excluir minha conta"}
        </button>
        <button
          onClick={() => setEtapa("idle")}
          disabled={etapa === "excluindo"}
          className="flex-1 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-60 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
