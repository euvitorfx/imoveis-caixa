"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ExcluirLaudoBtn({ laudoId }: { laudoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  async function excluir() {
    setLoading(true);
    await fetch(`/api/laudos/${laudoId}`, { method: "DELETE" });
    router.push("/perfil");
  }

  if (confirmando) {
    return (
      <div className="flex gap-2 items-center">
        <span className="text-xs text-gray-500">Tem certeza?</span>
        <button
          onClick={excluir}
          disabled={loading}
          className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
        >
          {loading ? "Excluindo..." : "Sim, excluir"}
        </button>
        <button
          onClick={() => setConfirmando(false)}
          className="text-xs text-gray-400 hover:underline"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirmando(true)}
      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
    >
      Excluir pedido
    </button>
  );
}
