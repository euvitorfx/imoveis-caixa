import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getLaudoById, BLOCO_LABEL } from "@/lib/laudos";

type Params = { params: Promise<{ id: string }> };

export default async function LaudoPdfPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) notFound();

  const isAdmin = false; // admin acessa diretamente
  if (laudo.userId !== session.user.id && !isAdmin) notFound();

  const valorFmt = (laudo.preco / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const imovel = laudo.imovelData as Record<string, string | number | undefined>;

  return (
    <>
      {/* Print controls — hidden on print */}
      <div className="print:hidden fixed bottom-6 right-6 z-50 flex gap-3">
        <a
          href={`/laudos/${id}`}
          className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-700 shadow hover:bg-gray-50"
        >
          ← Voltar
        </a>
        <button
          onClick={() => window.print()}
          className="px-5 py-2 rounded-xl text-sm font-bold text-white shadow"
          style={{ backgroundColor: "#01304D" }}
        >
          📄 Imprimir / Salvar PDF
        </button>
      </div>

      {/* Laudo — optimized for print */}
      <div className="max-w-3xl mx-auto pb-16 print:pb-0 print:max-w-none">

        {/* Capa */}
        <div
          className="rounded-2xl p-8 mb-8 print:rounded-none print:mb-6"
          style={{ backgroundColor: "#01304D", color: "white" }}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#F59E0B" }}>
                Busca Leilões Caixa
              </p>
              <h1 className="text-2xl font-bold leading-tight">
                Laudo de Análise BLC
              </h1>
            </div>
            <div className="text-right text-xs opacity-60">
              <p>Emitido em {dataHoje}</p>
              <p className="font-mono mt-1 text-xs">#{id.slice(-8).toUpperCase()}</p>
            </div>
          </div>

          <div className="border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
            <p className="text-sm opacity-70 mb-1">Imóvel analisado</p>
            <p className="text-xl font-bold">{laudo.imovelDescricao}</p>
            {imovel.hdnImovel && (
              <p className="text-sm opacity-50 mt-1">Nº {imovel.hdnImovel as string}</p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {imovel.tipo && (
              <span className="bg-white/10 px-3 py-1 rounded-full">{imovel.tipo as string}</span>
            )}
            {imovel.areaTotal && (
              <span className="bg-white/10 px-3 py-1 rounded-full">{imovel.areaTotal as number} m²</span>
            )}
            {imovel.preco && (
              <span
                className="px-3 py-1 rounded-full font-bold"
                style={{ backgroundColor: "#F59E0B", color: "#01304D" }}
              >
                {(imovel.preco as number).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
              </span>
            )}
            {imovel.modalidade && (
              <span className="bg-white/10 px-3 py-1 rounded-full">{imovel.modalidade as string}</span>
            )}
          </div>
        </div>

        {/* Aviso de qualidade */}
        <div
          className="rounded-xl px-4 py-3 mb-6 text-sm print:mb-4"
          style={{ backgroundColor: "#FEF3C7", border: "1px solid #F59E0B" }}
        >
          <span className="font-bold" style={{ color: "#92400E" }}>
            ✅ Laudo revisado por especialista —{" "}
          </span>
          <span style={{ color: "#92400E" }}>
            Este relatório foi produzido com auxílio de IA e revisado manualmente por Vítor Valença,
            especialista em leilões da Caixa com dezenas de arrematações.
          </span>
        </div>

        {/* Blocos */}
        {(Object.entries(laudo.blocos) as [keyof typeof laudo.blocos, typeof laudo.blocos.mercado][]).map(
          ([key, bloco]) => (
            <div key={key} className="bg-white rounded-2xl shadow mb-6 overflow-hidden print:shadow-none print:border print:border-gray-200">
              {/* Bloco header */}
              <div className="px-6 py-4" style={{ backgroundColor: "#F4F9FC", borderBottom: "1px solid #CBD9E3" }}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: "#01304D" }}
                  >
                    {Object.keys(laudo.blocos).indexOf(key) + 1}
                  </span>
                  <h2 className="font-bold text-gray-800">{BLOCO_LABEL[key]}</h2>
                </div>
              </div>

              {/* Bloco content */}
              <div className="px-6 py-5">
                {bloco.conteudo ? (
                  <div
                    className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap"
                  >
                    {bloco.conteudo}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">
                    {bloco.status === "concluido"
                      ? "Análise concluída."
                      : bloco.status === "em_andamento"
                      ? "Análise em andamento..."
                      : "Aguardando produção."}
                  </p>
                )}
              </div>
            </div>
          )
        )}

        {/* Rodapé */}
        <div className="border-t pt-6 text-center text-xs text-gray-400 print:pt-4">
          <p>Busca Leilões Caixa · buscaleiloescaixa.com.br</p>
          <p className="mt-1">
            Este laudo é de uso exclusivo do comprador e não substitui assessoria jurídica.
          </p>
          <p className="mt-1 font-mono opacity-50">#{id}</p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 1.5cm; }
          body { font-size: 12px; }
        }
      `}</style>
    </>
  );
}
