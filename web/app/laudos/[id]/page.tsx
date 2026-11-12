import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getLaudoById, STATUS_LABEL, BLOCO_LABEL } from "@/lib/laudos";
import type { LaudoStatus, BlocoStatus } from "@/lib/laudos";
import ExcluirLaudoBtn from "@/components/ExcluirLaudoBtn";

function statusColor(s: LaudoStatus) {
  const map: Record<LaudoStatus, string> = {
    aguardando_pagamento: "bg-yellow-50 text-yellow-800 border border-yellow-200",
    pago: "bg-blue-50 text-blue-800 border border-blue-200",
    em_producao: "bg-amber-50 text-amber-800 border border-amber-200",
    entregue: "bg-green-50 text-green-800 border border-green-200",
    cancelado: "bg-gray-100 text-gray-500 border border-gray-200",
  };
  return map[s] ?? "bg-gray-100 text-gray-500";
}

function blocoIcon(s: BlocoStatus) {
  return s === "concluido" ? "✅" : s === "em_andamento" ? "🔄" : "⏳";
}

function blocoColor(s: BlocoStatus) {
  return s === "concluido"
    ? "bg-green-50 border-green-200"
    : s === "em_andamento"
    ? "bg-amber-50 border-amber-200"
    : "bg-gray-50 border-gray-100";
}

type Params = { params: Promise<{ id: string }> };

export default async function LaudoPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const laudo = await getLaudoById(id);

  if (!laudo) notFound();
  if (laudo.userId !== session.user.id) notFound();

  const valorFmt = (laudo.preco / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const criadoEm = new Date(laudo.criadoEm).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const todosBlocosOk = Object.values(laudo.blocos).every(
    (b) => b.status === "concluido"
  );

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: "#01304D" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#F59E0B" }}>
          {laudo.nivel === 1 ? "Laudo Digital BLC" : "Laudo BLC + Consulta"}
          {laudo.numero && <span className="ml-2 opacity-70">· #{String(laudo.numero).padStart(4, "0")}</span>}
        </p>
        <h1 className="text-white font-bold text-xl leading-tight">
          {laudo.imovelDescricao}
        </h1>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor(laudo.status)}`}
          >
            {STATUS_LABEL[laudo.status]}
          </span>
          <span className="text-sm font-bold" style={{ color: "#F59E0B" }}>
            {valorFmt}
          </span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            Pedido em {criadoEm}
          </span>
        </div>
      </div>

      {/* Aguardando pagamento */}
      {laudo.status === "aguardando_pagamento" && (
        <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: "#FEF3C7", border: "1px solid #F59E0B" }}>
          <p className="font-semibold mb-1" style={{ color: "#92400E" }}>
            ⏳ Aguardando confirmação do pagamento
          </p>
          <p className="text-sm" style={{ color: "#92400E" }}>
            Assim que o PIX for confirmado, seu laudo entrará em produção.
          </p>
          <div className="flex items-center justify-between mt-2">
            <a
              href={`/laudos/checkout/${id}`}
              className="text-xs font-semibold underline"
              style={{ color: "#92400E" }}
            >
              Voltar ao QR code →
            </a>
            <ExcluirLaudoBtn laudoId={id} />
          </div>
        </div>
      )}

      {/* Prazo estimado */}
      {(laudo.status === "pago" || laudo.status === "em_producao") && (
        <div
          className="rounded-xl p-4 text-sm flex items-start gap-3"
          style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
        >
          <span className="text-lg shrink-0">⏱</span>
          <div>
            <p className="font-semibold text-green-800">
              {laudo.status === "em_producao" ? "Em produção" : "Pagamento confirmado"}
            </p>
            <p className="text-green-700 text-xs mt-0.5">
              Prazo estimado: <strong>até 2 dias úteis</strong>. Você receberá um e-mail quando o laudo estiver pronto.
            </p>
          </div>
        </div>
      )}

      {/* Nível 2 — instrução de agendamento */}
      {laudo.nivel === 2 && laudo.status !== "aguardando_pagamento" && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}
        >
          <p className="font-semibold text-blue-800 mb-1">
            📱 Agendar consulta com especialista
          </p>
          <p className="text-blue-700 text-xs mb-2">
            Entre em contato via WhatsApp para agendar sua consulta de 30 minutos com Vítor Valença.
          </p>
          <a
            href="https://wa.me/5582987801819?text=Olá%2C%20comprei%20o%20Laudo%20BLC%20e%20gostaria%20de%20agendar%20minha%20consulta."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: "#25D366" }}
          >
            <span>💬</span>
            Falar no WhatsApp
          </a>
        </div>
      )}

      {/* Blocos do laudo */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="font-bold text-gray-800 mb-4">Andamento do laudo</h2>

        <div className="space-y-3">
          {(Object.entries(laudo.blocos) as [keyof typeof laudo.blocos, typeof laudo.blocos.mercado][]).map(
            ([key, bloco]) => (
              <div
                key={key}
                className={`rounded-xl p-4 border ${blocoColor(bloco.status)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span>{blocoIcon(bloco.status)}</span>
                    <span className="font-semibold text-sm text-gray-800">
                      {BLOCO_LABEL[key]}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      bloco.status === "concluido"
                        ? "bg-green-100 text-green-700"
                        : bloco.status === "em_andamento"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {bloco.status === "concluido"
                      ? "Concluído"
                      : bloco.status === "em_andamento"
                      ? "Em andamento"
                      : "Na fila"}
                  </span>
                </div>

                {bloco.status === "concluido" && bloco.conteudo && (
                  laudo.status === "entregue" ? (
                    <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {bloco.conteudo}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500 italic">
                      Análise concluída — disponível quando o laudo for entregue.
                    </p>
                  )
                )}
              </div>
            )
          )}
        </div>

        {todosBlocosOk && laudo.status === "entregue" && (
          <div className="mt-4 p-4 rounded-xl text-center" style={{ backgroundColor: "#D1FAE5", border: "1px solid #6EE7B7" }}>
            <p className="font-bold text-green-800 mb-2">🎉 Laudo concluído!</p>
            <a
              href={`/laudos/${id}/pdf`}
              target="_blank"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: "#01304D" }}
            >
              📄 Visualizar e baixar laudo em PDF
            </a>
          </div>
        )}
      </div>

      {/* Dados do pedido */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="font-bold text-gray-800 mb-3 text-sm">Dados do pedido</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Protocolo</span>
            <span className="font-mono text-xs text-gray-700">{id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Produto</span>
            <span className="text-gray-700">
              {laudo.nivel === 1 ? "Laudo Digital" : "Laudo + Consulta"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Valor</span>
            <span className="font-semibold text-gray-800">{valorFmt}</span>
          </div>
          {laudo.paidAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">Pago em</span>
              <span className="text-gray-700">
                {new Date(laudo.paidAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        Dúvidas?{" "}
        <a
          href="mailto:atendimento@buscaleiloescaixa.com.br"
          className="underline"
          style={{ color: "#01304D" }}
        >
          atendimento@buscaleiloescaixa.com.br
        </a>
      </p>
    </div>
  );
}
