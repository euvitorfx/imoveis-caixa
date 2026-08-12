import { Metadata } from "next";
import { Suspense } from "react";
import AnaliseFormWrapper from "./AnaliseFormWrapper";

export const metadata: Metadata = {
  title: "Nova Análise de Viabilidade",
};

export default function NovaAnalisePage() {
  return (
    <div className="max-w-6xl mx-auto py-2 px-0">
      <div className="mb-6">
        <a href="/ferramentas/viabilidade" className="text-sm text-blue-600 hover:underline">
          ← Minhas análises
        </a>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">Nova Análise de Viabilidade</h1>
      </div>
      <Suspense fallback={<div className="text-gray-400 text-sm py-8 text-center">Carregando...</div>}>
        <AnaliseFormWrapper />
      </Suspense>
    </div>
  );
}
