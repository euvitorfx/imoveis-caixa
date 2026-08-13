"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { brl } from "@/lib/analises";

interface Resumo {
  _id: string;
  nome: string;
  criadaEm: string;
  atualizadaEm: string;
  imovelRef?: { cidade: string; estado: string };
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function ViabilidadeListPage() {
  const { status } = useSession();
  const [analises, setAnalises] = useState<Resumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") { setLoading(false); return; }
    fetch("/api/analises")
      .then((r) => r.json())
      .then(setAnalises)
      .finally(() => setLoading(false));
  }, [status]);

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"?`)) return;
    await fetch(`/api/analises/${id}`, { method: "DELETE" });
    setAnalises((p) => p.filter((a) => a._id !== id));
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Análises de Viabilidade</h1>
          <p className="text-sm text-gray-500 mt-1">Calcule o ROI e a viabilidade financeira de imóveis em leilão.</p>
        </div>
        <Link
          href="/ferramentas/viabilidade/nova"
          className="px-4 py-2 rounded-lg text-white font-semibold text-sm transition-colors"
          style={{ backgroundColor: "#01304D" }}
        >
          + Nova análise
        </Link>
      </div>

      {status === "unauthenticated" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-sm text-amber-800 mb-3">
            Faça login para salvar e acessar suas análises de viabilidade.
          </p>
          <Link href="/login?callbackUrl=/ferramentas/viabilidade" className="text-sm font-semibold text-amber-700 underline">
            Entrar na conta →
          </Link>
        </div>
      )}

      {status === "authenticated" && loading && (
        <p className="text-gray-400 text-center py-16">Carregando...</p>
      )}

      {status === "authenticated" && !loading && analises.length === 0 && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-semibold text-gray-700 mb-1">Nenhuma análise ainda</p>
          <p className="text-sm text-gray-500 mb-4">
            Crie sua primeira análise de viabilidade para calcular ROI, custos e lucro.
          </p>
          <Link
            href="/ferramentas/viabilidade/nova"
            className="inline-block px-5 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ backgroundColor: "#01304D" }}
          >
            Criar análise
          </Link>
        </div>
      )}

      {analises.length > 0 && (
        <div className="bg-white rounded-2xl shadow border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b bg-gray-50">
                <th className="px-5 py-3 font-medium">Análise</th>
                <th className="px-5 py-3 font-medium">Imóvel</th>
                <th className="px-5 py-3 font-medium">Atualizada</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {analises.map((a) => (
                <tr key={a._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/ferramentas/viabilidade/${a._id}`} className="font-semibold text-gray-800 hover:text-blue-600 hover:underline">
                      {a.nome}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {a.imovelRef ? `${a.imovelRef.cidade}/${a.imovelRef.estado}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-400">{fmtData(a.atualizadaEm)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex gap-3 justify-end">
                      <Link href={`/ferramentas/viabilidade/${a._id}`} className="text-blue-600 hover:underline text-xs">
                        Editar
                      </Link>
                      <button onClick={() => excluir(a._id, a.nome)} className="text-red-500 hover:underline text-xs">
                        Excluir
                      </button>
                    </div>
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
