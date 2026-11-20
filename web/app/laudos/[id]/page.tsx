import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getLaudoById, STATUS_LABEL } from "@/lib/laudos";
import type { LaudoStatus } from "@/lib/laudos";
import ExcluirLaudoBtn from "@/components/ExcluirLaudoBtn";
import LaudoViewer from "./LaudoViewer";

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

  // Verifica se há algum bloco com conteúdo para mostrar o viewer
  const temConteudo = Object.values(laudo.blocos).some(b => b?.conteudo);

  // Enriquece imovelData com campos completos do imóvel (endereço, bairro, área, quartos…)
  // O snapshot guardado no laudo só tem campos mínimos da Caixa.
  if (laudo.imovelId && ObjectId.isValid(laudo.imovelId)) {
    try {
      const client = await clientPromise;
      const imovel = await client
        .db(process.env.MONGODB_DB)
        .collection(process.env.MONGODB_COLLECTION!)
        .findOne({ _id: new ObjectId(laudo.imovelId) });
      if (imovel) {
        const campos = ["endereco","bairro","estado","areaUtil","areaTotal","quartos",
                        "descricao","precoAval","empreendimento","condominio","nomeCondominio"] as const;
        for (const c of campos) {
          if (imovel[c] !== undefined && imovel[c] !== null) {
            (laudo.imovelData as Record<string, unknown>)[c] = imovel[c];
          }
        }
      }
    } catch { /* não bloqueia a renderização se falhar */ }
  }

  // Serializa o laudo para o Client Component (JSON.parse remove ObjectId e tipos não serializáveis)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const laudoParaViewer = JSON.parse(JSON.stringify(laudo)) as any;

  const cookieStore = await cookies();
  const canEdit = cookieStore.get("admin_token")?.value === process.env.ADMIN_SECRET;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-16 px-4">
      {/* ── Header do pedido ── */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: "#01304D" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#F59E0B" }}>
          {laudo.nivel === 1 ? "Laudo Digital BLC" : "Laudo BLC + Consulta"}
          {laudo.numero && <span className="ml-2 opacity-70">· #{String(laudo.numero).padStart(4, "0")}</span>}
        </p>
        <h1 className="text-white font-bold text-xl leading-tight">
          {laudo.imovelDescricao}
        </h1>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor(laudo.status)}`}>
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

      {/* ── Aviso: aguardando pagamento ── */}
      {laudo.status === "aguardando_pagamento" && (
        <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: "#FEF3C7", border: "1px solid #F59E0B" }}>
          <p className="font-semibold mb-1" style={{ color: "#92400E" }}>
            ⏳ Aguardando confirmação do pagamento
          </p>
          <p className="text-sm" style={{ color: "#92400E" }}>
            Assim que o PIX for confirmado, seu laudo entrará em produção.
          </p>
          <div className="flex items-center justify-between mt-2">
            <a href={`/laudos/checkout/${id}`} className="text-xs font-semibold underline" style={{ color: "#92400E" }}>
              Voltar ao QR code →
            </a>
            <ExcluirLaudoBtn laudoId={id} />
          </div>
        </div>
      )}

      {/* ── Aviso: em produção ── */}
      {(laudo.status === "pago" || laudo.status === "em_producao") && !temConteudo && (
        <div className="rounded-xl p-4 text-sm flex items-start gap-3" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}>
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

      {/* ── Nível 2: agendamento de consulta ── */}
      {laudo.nivel === 2 && laudo.status !== "aguardando_pagamento" && (
        <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}>
          <p className="font-semibold text-blue-800 mb-1">📱 Agendar consulta com especialista</p>
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

      {/* ── Conteúdo do laudo (viewer + edição) ── */}
      {temConteudo && (
        <LaudoViewer
          laudo={laudoParaViewer}
          canEdit={canEdit}
        />
      )}

      {/* ── Sem conteúdo ainda: lista os blocos pendentes ── */}
      {!temConteudo && laudo.status !== "aguardando_pagamento" && (
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-bold text-gray-800 mb-4">Andamento do laudo</h2>
          <div className="space-y-3">
            {(Object.entries(laudo.blocos) as [string, { status: string }][]).map(([key, bloco]) => (
              <div key={key} className="rounded-xl p-4 border bg-gray-50 border-gray-100">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-gray-800">
                    {({ mercado: "Análise de Mercado", matricula: "Análise da Matrícula", juridica: "Análise Jurídica", viabilidade: "Viabilidade Financeira", parecer: "Parecer Final" } as Record<string, string>)[key] ?? key}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {bloco.status === "concluido" ? "Concluído" : bloco.status === "em_andamento" ? "Em andamento" : "Na fila"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Dados do pedido ── */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="font-bold text-gray-800 mb-3 text-sm">Dados do pedido</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Protocolo</span>
            <span className="font-mono text-xs text-gray-700">{id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Produto</span>
            <span className="text-gray-700">{laudo.nivel === 1 ? "Laudo Digital" : "Laudo + Consulta"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Valor</span>
            <span className="font-semibold text-gray-800">{valorFmt}</span>
          </div>
          {laudo.paidAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">Pago em</span>
              <span className="text-gray-700">{new Date(laudo.paidAt).toLocaleDateString("pt-BR")}</span>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        Dúvidas?{" "}
        <a href="mailto:atendimento@buscaleiloescaixa.com.br" className="underline" style={{ color: "#01304D" }}>
          atendimento@buscaleiloescaixa.com.br
        </a>
      </p>
    </div>
  );
}
