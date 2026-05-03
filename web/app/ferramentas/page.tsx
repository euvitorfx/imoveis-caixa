import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ferramentas & Serviços",
  description: "Planilha de viabilidade, assessoria para arrematação, análise de crédito Caixa e muito mais. Tudo que você precisa para arrematar com segurança.",
};

const FERRAMENTAS = [
  {
    icone: "📊",
    titulo: "Planilha de Análise de Viabilidade",
    subtitulo: "ÁREA DE MEMBROS",
    tag: "Exclusivo",
    tagColor: "bg-green-100 text-green-700",
    descricao:
      "Ferramenta completa para analisar a viabilidade financeira de imóveis em leilão. Calcule custos, retorno esperado e riscos antes de arrematar.",
    cta: "Acesso para membros",
    ctaHref: "#",
    ctaStyle: "bg-green-600 hover:bg-green-700 text-white",
    destaque: true,
    desabilitado: false,
  },
  {
    icone: "⚡",
    titulo: "Processo Rápido",
    subtitulo: "FERRAMENTA EXTERNA",
    tag: "Em breve",
    tagColor: "bg-gray-100 text-gray-500",
    descricao:
      "Consulte processos judiciais e baixe a íntegra de processos de forma rápida e prática. Indispensável para due diligence antes de arrematar.",
    cta: "Disponível em Breve",
    ctaHref: "#",
    ctaStyle: "bg-gray-300 text-gray-500 cursor-not-allowed",
    destaque: false,
    desabilitado: true,
  },
  {
    icone: "🏦",
    titulo: "Análise de Crédito Imobiliário Caixa",
    subtitulo: "SERVIÇO",
    tag: "Em breve",
    tagColor: "bg-gray-100 text-gray-500",
    descricao:
      "Nossa equipe analisa seu perfil e verifica sua elegibilidade para financiamento imobiliário pela Caixa. Preencha o formulário e aguarde nosso contato.",
    cta: "Disponível em Breve",
    ctaHref: "#",
    ctaStyle: "bg-gray-300 text-gray-500 cursor-not-allowed",
    destaque: false,
    desabilitado: true,
  },
  {
    icone: "🤝",
    titulo: "Assessoria para Arrematação",
    subtitulo: "ACOMPANHAMENTO PESSOAL",
    tag: "Serviço premium",
    tagColor: "bg-purple-100 text-purple-700",
    descricao:
      "Acompanhamento personalizado para quem quer arrematar um imóvel com segurança. Do estudo e análise técnica do imóvel até a arrematação, com suporte em cada etapa do processo.",
    cta: "Falar no WhatsApp",
    ctaHref: "https://wa.me/5582920015580?text=Ol%C3%A1%21+Gostaria+de+saber+mais+sobre+a+Assessoria+para+Arremata%C3%A7%C3%A3o.",
    ctaStyle: "bg-purple-600 hover:bg-purple-700 text-white",
    destaque: false,
    desabilitado: false,
  },
  {
    icone: "👥",
    titulo: "Arremate Comigo",
    subtitulo: "INVESTIMENTO EM GRUPO",
    tag: "Novidade",
    tagColor: "bg-red-100 text-red-700",
    descricao:
      "Investimento em grupo: do pré-leilão até a venda, nós gerenciamos tudo para você. Rentabilidade acima do mercado com total transparência — acompanhe tudo em tempo real. Cota mínima de R$ 30.000.",
    cta: "Solicitar informações",
    ctaHref: "https://wa.me/5582920015580?text=Ol%C3%A1%21+Gostaria+de+saber+mais+sobre+o+programa+Arremate+Comigo.",
    ctaStyle: "bg-red-600 hover:bg-red-700 text-white",
    destaque: false,
    desabilitado: false,
  },
];

export default function FerramentasPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Ferramentas & Serviços</h1>
        <p className="text-gray-500 text-sm mt-1">
          Tudo que você precisa para arrematar imóveis com segurança e inteligência.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {FERRAMENTAS.map((f) => (
          <div
            key={f.titulo}
            className={`bg-white rounded-xl shadow flex flex-col overflow-hidden ${
              f.destaque ? "ring-2 ring-green-500" : ""
            } ${f.desabilitado ? "opacity-70" : ""}`}
          >
            {f.destaque && (
              <div className="bg-green-500 text-white text-xs font-semibold text-center py-1 tracking-wide uppercase">
                ⭐ Exclusivo para membros
              </div>
            )}

            <div className="p-5 flex flex-col flex-1">
              {/* Ícone + tag */}
              <div className="flex items-start justify-between mb-3">
                <span className="text-4xl">{f.icone}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${f.tagColor}`}>
                  {f.tag}
                </span>
              </div>

              {/* Título */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {f.subtitulo}
              </p>
              <h2 className="text-base font-bold text-gray-800 mb-3 leading-snug">
                {f.titulo}
              </h2>

              {/* Descrição */}
              <p className="text-sm text-gray-500 flex-1 mb-5">{f.descricao}</p>

              {/* CTA */}
              {f.desabilitado ? (
                <span className={`block text-center text-sm font-semibold px-4 py-2.5 rounded-lg ${f.ctaStyle}`}>
                  🔒 {f.cta}
                </span>
              ) : (
                <a
                  href={f.ctaHref}
                  target={f.ctaHref.startsWith("https://wa.me") ? "_blank" : undefined}
                  rel={f.ctaHref.startsWith("https://wa.me") ? "noopener noreferrer" : undefined}
                  className={`block text-center text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors ${f.ctaStyle}`}
                >
                  {f.cta} →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400 mt-10 italic">
        Dúvidas? Entre em contato pelo e-mail{" "}
        <a href="mailto:atendimento@buscaleiloescaixa.com.br" className="text-blue-500 hover:underline">
          atendimento@buscaleiloescaixa.com.br
        </a>
      </p>
    </div>
  );
}
