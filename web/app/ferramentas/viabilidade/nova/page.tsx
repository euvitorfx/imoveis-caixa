import { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import AnaliseFormWrapper from "./AnaliseFormWrapper";

export const metadata: Metadata = {
  title: "Nova Análise de Viabilidade",
};

export default async function NovaAnalisePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/ferramentas/viabilidade/nova");

  if (session.user.plano === "gratuito") {
    const client = await clientPromise;
    const total = await client
      .db(process.env.MONGODB_DB)
      .collection("analises_viabilidade")
      .countDocuments({ userId: session.user.id });

    if (total >= 1) {
      return (
        <div className="max-w-lg mx-auto py-16 text-center px-4">
          <div className="text-5xl mb-5">🔒</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Limite do plano gratuito</h2>
          <p className="text-gray-500 text-sm mb-6">
            No plano gratuito você pode salvar <strong>1 análise de viabilidade</strong>.
            Faça upgrade para Premium e crie análises ilimitadas.
          </p>
          <a
            href="/ferramentas/viabilidade"
            className="inline-block px-5 py-2.5 rounded-lg text-white text-sm font-semibold mb-4"
            style={{ backgroundColor: "#01304D" }}
          >
            Ver minha análise
          </a>
          <p className="text-xs text-gray-400">
            Quer fazer upgrade para Premium?{" "}
            <a
              href="mailto:atendimento@buscaleiloescaixa.com.br"
              className="text-blue-500 hover:underline"
            >
              Entre em contato
            </a>
          </p>
        </div>
      );
    }
  }

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
