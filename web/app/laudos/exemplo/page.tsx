import Link from "next/link";

const BLOCOS = [
  {
    key: "mercado",
    icon: "📊",
    label: "Análise de Mercado",
    conteudo: `Comparativo realizado com 14 imóveis similares comercializados nos últimos 12 meses no bairro Jatiúca, Maceió/AL.

Valor de mercado estimado: R$ 247.000
Lance mínimo do leilão: R$ 143.100
Desconto sobre o mercado: 42,1%

Imóveis comparáveis vendidos:
• Apto 72m² na Rua dos Pinheiros — R$ 238.000 (jul/2026)
• Apto 68m² na Av. Jatiúca — R$ 255.000 (set/2026)
• Apto 75m² no Ed. Atlântico Norte — R$ 261.000 (out/2026)

Conclusão: O lance mínimo representa uma oportunidade real de aquisição abaixo do valor de mercado. Lances até R$ 190.000 ainda representam desconto significativo.

ROI estimado em revenda imediata: 34% | Aluguel estimado: R$ 2.200/mês`,
  },
  {
    key: "matricula",
    icon: "📋",
    label: "Análise da Matrícula",
    conteudo: `Matrícula nº 45.892 — Cartório de Registro de Imóveis da 2ª Circunscrição de Maceió/AL.

Área total: 72,00 m² | Área privativa: 68,50 m² | Fração ideal: 0,0183

Histórico de proprietários:
• 2008: Primeira aquisição pelo executado (José Carlos Ferreira)
• 2019: Hipoteca bancária registrada (Caixa Econômica Federal)

Situação atual dos ônus:
• Hipoteca: quitada pelo procedimento de leilão — sub-rogada ao novo arrematante
• Penhora: registrada nos autos do processo (nº 0023.456-78.2022.8.02.0001)
• Outros ônus: nenhum

Conclusão: Matrícula regular. Hipoteca será quitada com o produto do leilão. Nenhum impedimento adicional identificado.`,
  },
  {
    key: "juridica",
    icon: "⚖️",
    label: "Análise Jurídica",
    conteudo: `Processo: 0023.456-78.2022.8.02.0001
Vara: 3ª Vara Cível de Maceió/AL
Fase: Leilão — 1ª praça (28/nov/2026)

Natureza da ação: Execução de título extrajudicial (contrato de financiamento habitacional)

Ocupação: Imóvel ocupado pelo executado. Risco de desocupação judicial: estimado em 60–90 dias após arrematação, com base em precedentes similares na mesma vara.

Dívidas sub-rogáveis ao arrematante:
• IPTU: Sub-rogação NÃO aplicável — art. 130, parágrafo único do CTN. Dívidas anteriores ao leilão são extintas pelo edital.
• Condomínio: Verificar com síndico — 3 meses em aberto (aproximadamente R$ 1.800).

Risco de reversão do arremate: BAIXO
Não foram localizadas ações anulatórias, embargos de terceiro ativos ou impedimentos à transferência do bem.

Conclusão: Processo regular, sem surpresas jurídicas identificadas. Recomendamos requerer imissão na posse imediatamente após a homologação do arremate.`,
  },
  {
    key: "viabilidade",
    icon: "💰",
    label: "Viabilidade Financeira",
    conteudo: `Cenário 1 — Revenda após reforma
Lance estimado: R$ 165.000
Reforma estimada: R$ 35.000
Custo total: R$ 200.000
Valor de venda estimado: R$ 247.000
Lucro líquido estimado: R$ 36.900 (após ITBI e corretagem)
ROI: 18,5% | Prazo estimado: 6–9 meses

Cenário 2 — Locação
Lance estimado: R$ 165.000
Aluguel estimado: R$ 2.200/mês
Yield anual bruto: 16%
Payback: ~6,2 anos

Custos adicionais a considerar:
• ITBI: 2% sobre valor venal (≈ R$ 3.300)
• Escritura e registro: ≈ R$ 2.800
• Condomínio em aberto: ≈ R$ 1.800
• Total de custos extras estimados: R$ 7.900

Lance máximo recomendado para manter viabilidade: R$ 187.000
Acima desse valor, a margem de retorno torna-se inferior a 15%.

Recomendação: Oportunidade de alto potencial. Prioridade para estratégia de revenda após reforma simples.`,
  },
];

export default function ExemploLaudoPage() {
  return (
    <div className="max-w-xl mx-auto space-y-5 pb-10 px-4">

      {/* Aviso de exemplo */}
      <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
        style={{ backgroundColor: "#FEF3C7", border: "1px solid #F59E0B" }}>
        <span className="shrink-0">ℹ️</span>
        <p style={{ color: "#92400E" }}>
          <strong>Laudo de exemplo.</strong> Dados fictícios para ilustrar o formato e o nível de detalhe do produto real.
        </p>
      </div>

      {/* Header */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: "#01304D" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#F59E0B" }}>
          Laudo Digital BLC · #0001
        </p>
        <h1 className="text-white font-bold text-xl leading-tight">
          Apartamento 3 quartos · Maceió/AL
        </h1>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-800">
            Entregue
          </span>
          <span className="text-sm font-bold" style={{ color: "#F59E0B" }}>R$ 97,00</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            Pedido em 12 de novembro de 2026
          </span>
        </div>
      </div>

      {/* Blocos */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="font-bold text-gray-800 mb-4">Análise completa</h2>
        <div className="space-y-4">
          {BLOCOS.map(({ key, icon, label, conteudo }) => (
            <div key={key} className="rounded-xl border border-green-200 bg-green-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-green-100">
                <div className="flex items-center gap-2">
                  <span>{icon}</span>
                  <span className="font-semibold text-sm text-gray-800">{label}</span>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  Concluído
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{conteudo}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 p-4 rounded-xl text-center" style={{ backgroundColor: "#D1FAE5", border: "1px solid #6EE7B7" }}>
          <p className="font-bold text-green-800 mb-2">🎉 Laudo concluído!</p>
          <p className="text-xs text-green-700 mb-3">No laudo real, você recebe um PDF completo para download.</p>
          <Link
            href="/imovel"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: "#01304D" }}
          >
            Solicitar meu laudo →
          </Link>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-white rounded-2xl shadow p-5 text-center space-y-3">
        <p className="font-bold text-gray-800">Gostou do que viu?</p>
        <p className="text-sm text-gray-500">
          Solicite um laudo para o imóvel que você está de olho. A partir de R$97.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: "#F59E0B", color: "#01304D" }}
        >
          🏠 Buscar imóveis em leilão
        </Link>
      </div>
    </div>
  );
}
