const FERRAMENTAS = [
  {
    icone: "📊",
    titulo: "Planilha de Análise de Viabilidade",
    subtitulo: "PRODUTO PAGO",
    tag: "Compra",
    tagColor: "bg-green-100 text-green-700",
    descricao:
      "Ferramenta completa para analisar a viabilidade financeira de imóveis em leilão. Calcule custos, retorno esperado e riscos antes de arrematar.",
    cta: "Adquirir planilha",
    ctaHref: "#", // TODO: substituir pelo link real (Hotmart, Kiwify, etc.)
    ctaStyle: "bg-green-600 hover:bg-green-700 text-white",
    destaque: true,
  },
  {
    icone: "⚡",
    titulo: "Processo Rápido",
    subtitulo: "FERRAMENTA EXTERNA",
    tag: "Compra",
    tagColor: "bg-green-100 text-green-700",
    descricao:
      "Consulte processos judiciais e baixe a íntegra de processos de forma rápida e prática. Indispensável para due diligence antes de arrematar.",
    cta: "Adquirir acesso",
    ctaHref: "#", // TODO: substituir pelo link do site externo
    ctaStyle: "bg-green-600 hover:bg-green-700 text-white",
    destaque: false,
  },
  {
    icone: "🏦",
    titulo: "Análise de Crédito Imobiliário Caixa",
    subtitulo: "SERVIÇO",
    tag: "Serviço",
    tagColor: "bg-orange-100 text-orange-700",
    descricao:
      "Nossa equipe analisa seu perfil e verifica sua elegibilidade para financiamento imobiliário pela Caixa. Preencha o formulário e aguarde nosso contato.",
    cta: "Solicitar análise",
    ctaHref: "#", // TODO: link para formulário ou WhatsApp
    ctaStyle: "bg-orange-500 hover:bg-orange-600 text-white",
    destaque: false,
  },
  {
    icone: "🤝",
    titulo: "Assessoria para Arrematação",
    subtitulo: "ACOMPANHAMENTO PESSOAL",
    tag: "Serviço premium",
    tagColor: "bg-purple-100 text-purple-700",
    descricao:
      "Acompanhamento personalizado para quem quer arrematar um imóvel com segurança. Do estudo do imóvel até a arrematação, com suporte em cada etapa.",
    cta: "Quero assessoria",
    ctaHref: "#", // TODO: link WhatsApp ou formulário
    ctaStyle: "bg-purple-600 hover:bg-purple-700 text-white",
    destaque: false,
  },
  {
    icone: "👥",
    titulo: "Arremate Comigo",
    subtitulo: "COTIZAÇÃO EM GRUPO",
    tag: "Novidade",
    tagColor: "bg-red-100 text-red-700",
    descricao:
      "Arrematação de imóveis em grupo — divida os custos e maximize os resultados. Uma forma acessível e inteligente de investir em imóveis de leilão.",
    cta: "Quero participar",
    ctaHref: "#", // TODO: link de inscrição ou WhatsApp
    ctaStyle: "bg-red-600 hover:bg-red-700 text-white",
    destaque: false,
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
            }`}
          >
            {f.destaque && (
              <div className="bg-green-500 text-white text-xs font-semibold text-center py-1 tracking-wide uppercase">
                ⭐ Mais vendido
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
              <a
                href={f.ctaHref}
                className={`block text-center text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors ${f.ctaStyle}`}
              >
                {f.cta} →
              </a>
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
