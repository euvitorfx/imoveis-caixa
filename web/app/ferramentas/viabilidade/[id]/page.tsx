"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AnaliseForm from "../AnaliseForm";
import { AnaliseViabilidade } from "@/lib/analises";

export default function EditarAnalisePage() {
  const { id } = useParams<{ id: string }>();
  const [analise, setAnalise] = useState<AnaliseViabilidade | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch(`/api/analises/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Não encontrado");
        return r.json();
      })
      .then(setAnalise)
      .catch(() => setErro("Análise não encontrada ou sem permissão de acesso."));
  }, [id]);

  if (erro) return (
    <div className="max-w-4xl mx-auto py-8 text-center">
      <p className="text-red-600">{erro}</p>
      <a href="/ferramentas/viabilidade" className="text-sm text-blue-600 hover:underline mt-4 inline-block">
        ← Voltar para minhas análises
      </a>
    </div>
  );

  if (!analise) return (
    <div className="max-w-4xl mx-auto py-8 text-center text-gray-400">Carregando...</div>
  );

  return (
    <div className="max-w-6xl mx-auto py-2 px-0">
      <div className="mb-6">
        <a href="/ferramentas/viabilidade" className="text-sm text-blue-600 hover:underline">
          ← Minhas análises
        </a>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">{analise.nome}</h1>
      </div>
      <AnaliseForm inicial={analise} analiseId={id} />
    </div>
  );
}
