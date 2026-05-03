export interface Post {
  slug: string;
  titulo: string;
  resumo: string;
  data: string;
  leitura: string;
  conteudo: string;
}

export const POSTS: Post[] = [
  {
    slug: "como-funciona-leilao-caixa",
    titulo: "Como funciona o leilão de imóveis da Caixa: guia completo para iniciantes",
    resumo: "Entenda as modalidades de venda, como participar de um leilão, quais documentos são necessários e os cuidados antes de dar um lance.",
    data: "2026-05-01",
    leitura: "7 min",
    conteudo: `
## O que são os imóveis de leilão da Caixa?

A Caixa Econômica Federal oferta imóveis retomados de contratos de financiamento inadimplentes. Esses imóveis são vendidos abaixo do valor de avaliação e podem ser uma ótima oportunidade de compra.

## Modalidades de venda

**Leilão:** O imóvel é disputado em leilão presencial ou online. Vence quem der o maior lance acima do valor mínimo. Muitos leilões aceitam financiamento.

**Venda Online:** O imóvel fica disponível por um período no site da Caixa. O primeiro a apresentar uma proposta aceita garante o imóvel.

**Venda Direta:** Imóveis que não foram arrematados em leilão ou não foram vendidos online ficam disponíveis para negociação direta com a Caixa.

## Como participar

1. Acesse o site oficial da Caixa (venda-imoveis.caixa.gov.br)
2. Escolha o imóvel desejado
3. Verifique as condições no edital
4. Habilite-se junto à leiloeira responsável
5. Participe do leilão presencialmente ou online

## Documentos necessários

- RG e CPF
- Comprovante de residência
- Declaração de IR (se for financiar)
- Extrato do FGTS (se for usar)

## Dicas importantes

- Visite o imóvel antes de dar o lance sempre que possível
- Leia o edital completo — ele define todas as regras
- Verifique a matrícula do imóvel no cartório
- Considere contratar um advogado especializado
    `.trim(),
  },
  {
    slug: "financiamento-imovel-leilao-caixa",
    titulo: "É possível financiar um imóvel da Caixa adquirido em leilão?",
    resumo: "Muitos arrematantes não sabem que é possível usar financiamento — e até o FGTS — na compra de imóveis da Caixa. Veja as regras e condições.",
    data: "2026-04-25",
    leitura: "5 min",
    conteudo: `
## Financiamento em leilões da Caixa

Sim, é possível financiar imóveis adquiridos em leilão da Caixa, mas nem todos os imóveis aceitam essa modalidade. Use o filtro "Aceita financiamento" no Busca Leilões Caixa para encontrar os disponíveis.

## Condições gerais

- O imóvel precisa estar marcado como "aceita financiamento" no edital
- O comprador deve ter capacidade de crédito aprovada pela Caixa
- O valor financiado não pode ultrapassar 90% do valor de arrematação (em geral)
- O imóvel precisa ter valor mínimo de avaliação compatível com as regras do programa

## Usando o FGTS

O FGTS pode ser utilizado para:
- Amortizar parte do saldo devedor
- Compor entrada
- Pagar prestações (em alguns programas)

Para usar o FGTS, você precisa ter no mínimo 3 anos de carteira assinada (não precisam ser consecutivos) e não possuir imóvel residencial no município de trabalho.

## Como funciona na prática

1. Antes do leilão, consulte um correspondente Caixa e faça uma simulação
2. Obtenha uma carta de crédito pré-aprovada
3. No ato do arremate, informe que usará financiamento
4. A Caixa libera o crédito após análise do imóvel

## Atenção

Imóveis com problemas estruturais graves, invasões ou irregularidades na matrícula podem ter o financiamento negado mesmo que o edital indique essa possibilidade.
    `.trim(),
  },
  {
    slug: "venda-direta-vs-leilao",
    titulo: "Venda direta x leilão: qual a melhor opção para comprar imóvel da Caixa?",
    resumo: "Cada modalidade tem vantagens e riscos diferentes. Compare as duas formas de adquirir um imóvel da Caixa e descubra qual faz mais sentido para o seu perfil.",
    data: "2026-04-18",
    leitura: "6 min",
    conteudo: `
## Leilão

No leilão, os imóveis tendem a ter os maiores descontos — é comum encontrar imóveis com 20% a 50% abaixo do valor de mercado. A disputa entre compradores pode elevar o preço, mas você ainda assim costuma sair na frente.

**Vantagens do leilão:**
- Maiores descontos possíveis
- Processo transparente e regulamentado
- Possibilidade de financiamento em muitos casos

**Desvantagens:**
- Disputa com outros compradores
- Prazos curtos para decisão
- Necessidade de habilitação prévia

## Venda Direta

A venda direta é para imóveis que já passaram pelo leilão e não foram arrematados. O desconto costuma ser menor, mas o processo é mais simples.

**Vantagens da venda direta:**
- Processo mais simples e sem disputa
- Mais tempo para análise
- Negociação direta com a Caixa

**Desvantagens:**
- Descontos menores
- Seleção de imóveis mais limitada

## Qual escolher?

Se você está buscando o maior desconto possível e tem segurança para agir rápido, o leilão é a melhor opção. Se preferir mais tranquilidade e um processo menos competitivo, a venda direta pode ser ideal.

Use o filtro de modalidade no Busca Leilões Caixa para filtrar por "Leilão", "Venda Online" ou "Venda Direta".
    `.trim(),
  },
  {
    slug: "desconto-imoveis-caixa",
    titulo: "Como encontrar imóveis da Caixa com maior desconto",
    resumo: "Use os filtros de desconto para garimpar as melhores oportunidades. Saiba o que significa o percentual de desconto e como ele é calculado.",
    data: "2026-04-10",
    leitura: "4 min",
    conteudo: `
## Como o desconto é calculado?

O desconto dos imóveis da Caixa é calculado com base no valor de avaliação do imóvel. Se um imóvel foi avaliado em R$ 200.000 e está sendo ofertado por R$ 140.000, o desconto é de 30%.

**Fórmula:** Desconto = (1 - Preço de venda / Valor de avaliação) × 100

## Usando o filtro de desconto

No Busca Leilões Caixa, você pode filtrar imóveis com desconto mínimo de 10%, 20%, 30%, 40% ou 50%. Quanto maior o desconto, maior a oportunidade — mas também maior a atenção necessária.

## Por que alguns imóveis têm descontos maiores?

- Imóvel ocupado (o comprador precisa lidar com a desocupação)
- Imóvel em estado precário de conservação
- Localização menos valorizada
- Processo judicial pendente
- Irregularidades documentais

## Dicas para garimpar

1. Filtre por desconto acima de 30%
2. Ordene por "Menor preço" para ver as oportunidades mais acessíveis
3. Explore estados e cidades com maior volume de imóveis (SP, MG, BA)
4. Acompanhe diariamente — novos imóveis aparecem após cada atualização

## Cuidado com descontos muito altos

Imóveis com desconto acima de 50% merecem atenção redobrada. O desconto grande quase sempre indica uma complicação: ocupação, dívidas ou problemas estruturais. Nunca arremate sem pesquisar antes.
    `.trim(),
  },
  {
    slug: "cuidados-antes-arrematar",
    titulo: "5 cuidados essenciais antes de arrematar um imóvel da Caixa",
    resumo: "Visita ao imóvel, análise jurídica, dívidas de condomínio e IPTU, prazo de desocupação e outros pontos que você precisa verificar antes de dar o lance.",
    data: "2026-04-03",
    leitura: "8 min",
    conteudo: `
## 1. Visite o imóvel antes do leilão

Sempre que possível, faça uma visita ao imóvel. Isso é previsto em editais de leilão — a leiloeira costuma organizar dias de visitação. Observe o estado de conservação, se está ocupado e a situação do entorno.

Se não for possível visitar, pelo menos faça uma visita externa para avaliar a vizinhança, infraestrutura do bairro e estado aparente da fachada.

## 2. Leia o edital completo

O edital é o documento mais importante. Nele constam:
- Valor mínimo de lance
- Condições de pagamento
- Situação de ocupação
- Dívidas assumidas pelo comprador
- Prazo de desocupação (se houver)
- Documentos necessários para participar

Nunca pule essa etapa. O edital é o contrato.

## 3. Verifique a matrícula no cartório

Solicite a certidão de matrícula atualizada do imóvel no Cartório de Registro de Imóveis. Verifique:
- Ônus e gravames existentes
- Ações judiciais vinculadas
- Se a Caixa está devidamente registrada como credora
- Existência de penhoras de outros credores

## 4. Calcule todas as dívidas assumidas

Em leilões judiciais e extrajudiciais, algumas dívidas são de responsabilidade do arrematante:
- IPTU atrasado (em alguns casos)
- Condomínio em atraso (pode ser muito alto em imóveis ocupados há anos)
- Taxa de leiloeiro (geralmente 5% sobre o valor de arrematação)

Inclua essas dívidas no seu cálculo de custo total.

## 5. Tenha um plano para desocupação

Se o imóvel estiver ocupado, você precisará lidar com a desocupação após a arrematação. Isso pode ser feito por via amigável (acordo com o ocupante) ou judicial (ação de imissão na posse).

O prazo e o custo para desocupar variam muito. Em alguns casos, leva meses. Contrate um advogado especializado antes de arrematar imóveis ocupados.

---

Seguindo esses 5 passos, você terá muito mais segurança para arrematar um imóvel da Caixa com tranquilidade.
    `.trim(),
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
