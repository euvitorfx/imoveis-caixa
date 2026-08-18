import type { Corretor } from "@/lib/corretores";
import ClubeBLCProcessos from "./ClubeBLCProcessos";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; msg: string }
> = {
  sem_resposta: {
    label: "Em análise",
    color: "#6B7280",
    bg: "#F3F4F6",
    msg: "Recebemos seu cadastro e estamos verificando as informações. Em breve entraremos em contato.",
  },
  aguardando_retorno: {
    label: "Aguardando retorno",
    color: "#D97706",
    bg: "#FEF3C7",
    msg: "Tentamos entrar em contato. Por favor, verifique seus e-mails ou WhatsApp para retomar o processo.",
  },
  em_negociacao: {
    label: "Em negociação",
    color: "#2563EB",
    bg: "#EFF6FF",
    msg: "Sua parceria está sendo finalizada. Em breve você terá acesso completo ao painel do parceiro BLC.",
  },
  parceiro_fechado: {
    label: "Parceiro BLC",
    color: "#059669",
    bg: "#ECFDF5",
    msg: "Bem-vindo ao Clube BLC! Você é um parceiro certificado e pode indicar imóveis da Caixa aos seus clientes.",
  },
  recusou: {
    label: "Não participante",
    color: "#6B7280",
    bg: "#F3F4F6",
    msg: "Você optou por não participar do Clube BLC. Se mudou de ideia, entre em contato conosco.",
  },
};

export default function ClubeBLCCard({ corretor }: { corretor: Corretor }) {
  const status = corretor.status_relacionamento ?? "sem_resposta";
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.sem_resposta;
  const cidades = corretor.cidades_cobertura ?? [];

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
            Clube BLC
          </p>
          <h2 className="font-semibold text-gray-800 text-lg leading-tight">
            {corretor.nome}
          </h2>
          {corretor.creci && (
            <p className="text-xs text-gray-400 mt-0.5">CRECI {corretor.creci}</p>
          )}
        </div>
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full mt-0.5 shrink-0"
          style={{ color: cfg.color, backgroundColor: cfg.bg }}
        >
          {cfg.label}
        </span>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed mb-4">{cfg.msg}</p>

      {cidades.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Cidades de cobertura ({cidades.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cidades.map((c) => (
              <span
                key={`${c.uf}-${c.cidade}`}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
              >
                {c.cidade} – {c.uf}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        {corretor.email && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-0.5">E-mail cadastrado</p>
            <p className="font-medium text-gray-700 truncate text-xs">{corretor.email}</p>
          </div>
        )}
        {corretor.whatsapp && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-0.5">WhatsApp</p>
            <p className="font-medium text-gray-700 text-xs">
              +{corretor.whatsapp.slice(0, 2)} ({corretor.whatsapp.slice(2, 4)}){" "}
              {corretor.whatsapp.slice(4)}
            </p>
          </div>
        )}
        {corretor.assessoramento && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-0.5">Tipo de assessoria</p>
            <p className="font-medium text-gray-700 text-xs capitalize">
              {corretor.assessoramento === "digital_fisico" ? "Digital + Físico" : "Físico"}
            </p>
          </div>
        )}
        {typeof corretor.nota_caixa === "number" && (
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-amber-600 text-xs mb-0.5">Nota Caixa</p>
            <p className="font-semibold text-amber-700">★ {corretor.nota_caixa}</p>
          </div>
        )}
      </div>

      {status === "parceiro_fechado" && (
        <div
          className="mt-4 rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: "#ECFDF5", border: "1px solid #6EE7B7", color: "#065F46" }}
        >
          <strong>Próximo passo:</strong> acesse o painel do parceiro para abrir processos de compra para seus clientes.
        </div>
      )}
    </div>
  );
}

export function ClubeBLCCardComprador() {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Clube BLC</p>
      <h2 className="font-semibold text-gray-800 text-lg mb-1">Minhas compras</h2>
      <p className="text-sm text-gray-500 mb-4">
        Registre arrematações e acompanhe o andamento de cada processo com seu assessor BLC.
      </p>
      <ClubeBLCProcessos />
    </div>
  );
}
