const WM = "https://commons.wikimedia.org/wiki/Special:FilePath";

export const ESTADO_BANDEIRAS: Record<string, string> = {
  AC: `${WM}/Bandeira_do_Acre.svg?width=60`,
  AL: `${WM}/Bandeira_de_Alagoas.svg?width=60`,
  AM: `${WM}/Bandeira_do_Amazonas.svg?width=60`,
  AP: `${WM}/Bandeira_do_Amap%C3%A1.svg?width=60`,
  BA: `${WM}/Bandeira_da_Bahia.svg?width=60`,
  CE: `${WM}/Bandeira_do_Cear%C3%A1.svg?width=60`,
  DF: `${WM}/Bandeira_do_Distrito_Federal_(Brasil).svg?width=60`,
  ES: `${WM}/Bandeira_do_Esp%C3%ADrito_Santo.svg?width=60`,
  GO: `${WM}/Bandeira_de_Goi%C3%A1s.svg?width=60`,
  MA: `${WM}/Bandeira_do_Maranh%C3%A3o.svg?width=60`,
  MG: `${WM}/Bandeira_de_Minas_Gerais.svg?width=60`,
  MS: `${WM}/Bandeira_de_Mato_Grosso_do_Sul.svg?width=60`,
  MT: `${WM}/Bandeira_de_Mato_Grosso.svg?width=60`,
  PA: `${WM}/Bandeira_do_Par%C3%A1.svg?width=60`,
  PB: `${WM}/Bandeira_da_Para%C3%ADba.svg?width=60`,
  PE: `${WM}/Bandeira_de_Pernambuco.svg?width=60`,
  PI: `${WM}/Bandeira_do_Piau%C3%AD.svg?width=60`,
  PR: `${WM}/Bandeira_do_Paran%C3%A1.svg?width=60`,
  RJ: `${WM}/Bandeira_do_estado_do_Rio_de_Janeiro.svg?width=60`,
  RN: `${WM}/Bandeira_do_Rio_Grande_do_Norte.svg?width=60`,
  RO: `${WM}/Bandeira_de_Rond%C3%B4nia.svg?width=60`,
  RR: `${WM}/Bandeira_de_Roraima.svg?width=60`,
  RS: `${WM}/Bandeira_do_Rio_Grande_do_Sul.svg?width=60`,
  SC: `${WM}/Bandeira_de_Santa_Catarina.svg?width=60`,
  SE: `${WM}/Bandeira_de_Sergipe.svg?width=60`,
  SP: `${WM}/Bandeira_do_estado_de_S%C3%A3o_Paulo.svg?width=60`,
  TO: `${WM}/Bandeira_do_Tocantins.svg?width=60`,
};

export function slugify(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const ESTADO_NOMES: Record<string, string> = {
  AC: "Acre",                AP: "Amapá",            AM: "Amazonas",
  AL: "Alagoas",             BA: "Bahia",             CE: "Ceará",
  DF: "Distrito Federal",    ES: "Espírito Santo",    GO: "Goiás",
  MA: "Maranhão",            MG: "Minas Gerais",      MS: "Mato Grosso do Sul",
  MT: "Mato Grosso",         PA: "Pará",              PB: "Paraíba",
  PE: "Pernambuco",          PI: "Piauí",             PR: "Paraná",
  RJ: "Rio de Janeiro",      RN: "Rio Grande do Norte", RO: "Rondônia",
  RR: "Roraima",             RS: "Rio Grande do Sul", SC: "Santa Catarina",
  SE: "Sergipe",             SP: "São Paulo",         TO: "Tocantins",
};

export const ALL_ESTADOS = Object.keys(ESTADO_NOMES);

export const ESTADO_TEXTOS: Record<string, string> = {
  SP: "São Paulo concentra o maior acervo de imóveis da Caixa do Brasil, com destaque para apartamentos na Grande São Paulo, Campinas, Sorocaba e Ribeirão Preto. O estado oferece oportunidades em todas as faixas de preço, desde imóveis populares financiáveis pelo FGTS até grandes terrenos no interior. A alta liquidez do mercado paulista torna os leilões da Caixa especialmente atrativos para investidores.",
  RJ: "O Rio de Janeiro apresenta um acervo variado da Caixa, com imóveis na capital, Baixada Fluminense, Região Serrana e Costa Verde. Apartamentos em bairros como Bangu, Campo Grande e Nova Iguaçu costumam aparecer com descontos expressivos. A combinação de preços abaixo do mercado e alta demanda por locação torna o estado uma excelente opção para quem busca renda passiva.",
  MG: "Minas Gerais é um dos estados com maior volume de imóveis da Caixa, especialmente em Belo Horizonte, Contagem, Betim e no Vale do Aço. O estado se destaca por casas com amplos terrenos no interior e apartamentos bem localizados na capital com preços muito abaixo da avaliação. A forte tradição industrial e agropecuária garante demanda constante por imóveis.",
  PR: "O Paraná oferece imóveis da Caixa em Curitiba, Londrina, Maringá, Foz do Iguaçu e nas cidades do interior. O estado se destaca pela qualidade de vida elevada e pelo mercado imobiliário aquecido, o que valoriza os arremates. Casas em condomínio e terrenos em cidades de médio porte são oportunidades recorrentes no acervo paranaense.",
  RS: "O Rio Grande do Sul possui imóveis da Caixa distribuídos em Porto Alegre, Caxias do Sul, Pelotas, Santa Maria e no interior gaúcho. O estado tem forte tradição agropecuária e industrial, sustentando um mercado imobiliário resiliente. Casas em cidades de médio porte e apartamentos na capital surgem frequentemente com descontos atrativos.",
  SC: "Santa Catarina tem um dos mercados imobiliários mais valorizados do Sul, e ainda assim o acervo da Caixa apresenta oportunidades em Florianópolis, Joinville, Blumenau, Itajaí e no Vale do Itajaí. Imóveis litorâneos com potencial de locação por temporada são um diferencial único do estado. O crescimento econômico contínuo garante boa liquidez para quem arremata.",
  BA: "A Bahia concentra imóveis da Caixa em Salvador, Feira de Santana, Vitória da Conquista e no interior baiano. O estado tem um dos maiores acervos do Nordeste, com casas e terrenos a preços acessíveis e grande potencial de valorização. Salvador, em especial, oferece apartamentos em bairros nobres com descontos que raramente aparecem no mercado convencional.",
  CE: "O Ceará apresenta imóveis da Caixa em Fortaleza, Caucaia, Maracanaú, Juazeiro do Norte e no litoral cearense. Fortaleza é um dos mercados de leilão mais ativos do Nordeste, com apartamentos em regiões nobres e populares surgindo regularmente. A crescente atratividade turística do estado adiciona potencial de valorização para imóveis litorâneos.",
  PE: "Pernambuco tem imóveis da Caixa em Recife, Caruaru, Petrolina, Olinda e na Região Metropolitana. O Recife concentra as maiores oportunidades, com apartamentos em bairros consolidados aparecendo a preços muito abaixo da avaliação. O crescimento do Porto Digital e da economia regional aquece a demanda por imóveis bem localizados.",
  GO: "Goiás oferece imóveis da Caixa em Goiânia, Aparecida de Goiânia, Anápolis, Rio Verde e no entorno do Distrito Federal. O estado se destaca por terrenos e casas de alto padrão com grandes descontos, especialmente nos municípios próximos a Brasília. O agronegócio aquecido garante demanda constante por imóveis no interior goiano.",
  DF: "O Distrito Federal apresenta um acervo selecionado da Caixa com imóveis em Brasília, Taguatinga, Ceilândia, Samambaia e nas cidades-satélite. Os preços de avaliação refletem o alto custo de vida do DF, mas os descontos de leilão podem representar economias significativas. Apartamentos funcionais e casas em condomínio são os tipos mais frequentes no acervo.",
  ES: "O Espírito Santo tem imóveis da Caixa em Vitória, Serra, Vila Velha, Cariacica e no norte capixaba. O estado combina litoral valorizado e interior produtivo, gerando oportunidades variadas no acervo. Apartamentos na Grande Vitória com vista para o mar ou próximos ao polo industrial de Serra são destaques recorrentes.",
  MA: "O Maranhão apresenta imóveis da Caixa em São Luís, Imperatriz, Timon e Caxias. A capital São Luís, com seu centro histórico tombado pela UNESCO, oferece oportunidades únicas de imóveis a preços abaixo do mercado. O crescimento do agronegócio no sul maranhense também gera demanda por imóveis em Imperatriz e cidades vizinhas.",
  PA: "O Pará tem imóveis da Caixa em Belém, Ananindeua, Santarém, Marabá e no interior amazônico. Belém, com seu crescimento econômico acelerado e infraestrutura portuária, concentra as melhores oportunidades. A expansão do agronegócio no sudeste paraense tem gerado aumento no acervo de imóveis urbanos em Marabá e arredores.",
  MT: "Mato Grosso oferece imóveis da Caixa em Cuiabá, Várzea Grande, Rondonópolis, Sinop e nas cidades do agronegócio. O estado tem um dos mercados de terrenos mais dinâmicos do Centro-Oeste, impulsionado pela expansão da soja e do algodão. Casas e terrenos em Sinop e Lucas do Rio Verde surgem frequentemente com ótimas condições de financiamento.",
  MS: "Mato Grosso do Sul tem imóveis da Caixa em Campo Grande, Dourados, Corumbá e nas cidades da fronteira. Campo Grande concentra o maior volume, com apartamentos e casas em bairros residenciais a preços competitivos. O potencial do turismo no Pantanal e a força do agronegócio regional sustentam um mercado imobiliário em crescimento.",
  AM: "O Amazonas apresenta imóveis da Caixa concentrados principalmente em Manaus, com alguns registros em Parintins e Itacoatiara. A Zona Franca impulsiona a economia manauara e cria demanda constante por moradia. Apartamentos próximos ao polo industrial de Manaus e casas em bairros da zona leste surgem com frequência no acervo.",
  RN: "O Rio Grande do Norte tem imóveis da Caixa em Natal, Mossoró, Parnamirim e nas cidades do interior potiguar. Natal se destaca com apartamentos em bairros como Capim Macio, Ponta Negra e Lagoa Nova a preços abaixo do mercado. O potencial turístico do litoral norte e a industrialização de Mossoró ampliam as oportunidades no estado.",
  PB: "A Paraíba apresenta imóveis da Caixa em João Pessoa, Campina Grande, Patos e Cajazeiras. João Pessoa, com seu litoral turístico e expansão imobiliária, oferece apartamentos com bons descontos em bairros como Mangabeira e Bancários. Campina Grande, polo tecnológico e universitário, também concentra oportunidades interessantes.",
  AL: "Alagoas tem imóveis da Caixa em Maceió, Arapiraca, Rio Largo e no litoral alagoano. Maceió, com praias de águas cristalinas e crescimento do turismo, apresenta apartamentos em bairros como Pajuçara e Jatiúca a preços muito abaixo da avaliação. O interior alagoano oferece casas e terrenos para quem busca investimento de longo prazo.",
  SE: "Sergipe apresenta imóveis da Caixa em Aracaju, Nossa Senhora do Socorro, Lagarto e Itabaiana. Aracaju, a menor capital brasileira, tem um mercado imobiliário concentrado e dinâmico, com apartamentos em bairros como Jardins e Atalaia aparecendo regularmente no acervo. O estado oferece boa relação custo-benefício para quem busca imóveis no Nordeste.",
  PI: "O Piauí tem imóveis da Caixa em Teresina, Parnaíba, Picos e Floriano. Teresina concentra a maior parte do acervo, com casas e apartamentos em bairros como Fátima, Jóquei e Buenos Aires. A cidade vive um ciclo de modernização com novos empreendimentos, tornando os imóveis da Caixa uma porta de entrada acessível para o mercado local.",
  RO: "Rondônia oferece imóveis da Caixa em Porto Velho, Ji-Paraná, Cacoal e Ariquemes. O crescimento econômico impulsionado pela agropecuária e pelas hidrelétricas do Madeira aquece o mercado imobiliário estadual. Casas e terrenos em Porto Velho surgem com frequência no acervo, com boas condições de financiamento pelo FGTS.",
  TO: "O Tocantins apresenta imóveis da Caixa em Palmas, Araguaína, Gurupi e Porto Nacional. Palmas, a capital mais jovem do Brasil, tem um mercado imobiliário em franca expansão, com apartamentos e casas em condomínio a preços ainda acessíveis. A posição estratégica do estado no corredor logístico nacional tende a valorizar os imóveis nas próximas décadas.",
  AC: "O Acre tem imóveis da Caixa concentrados em Rio Branco, com registros em Cruzeiro do Sul e Sena Madureira. Rio Branco oferece oportunidades em bairros como Bosque e Cadeia Velha, com casas a preços acessíveis e boas condições de financiamento. O estado tem crescido economicamente com investimentos em infraestrutura, o que favorece a valorização dos imóveis arrematados.",
  AP: "O Amapá apresenta imóveis da Caixa principalmente em Macapá e Santana. A capital Macapá, única capital brasileira cortada pela linha do Equador, tem um mercado imobiliário em crescimento com demanda sustentada pelo funcionalismo público e pelo comércio. Apartamentos na área central e casas nos bairros residenciais surgem com condições atrativas no acervo.",
  RR: "Roraima tem imóveis da Caixa concentrados em Boa Vista, com a maior parte em bairros como Canarinho, Caçari e Nova Canaã. A capital é um dos mercados imobiliários que mais cresce no Norte do Brasil, impulsionado pelo funcionalismo federal e pelo comércio com a Venezuela. Oportunidades com financiamento pelo FGTS são frequentes no acervo roraimense.",
};

export function fmtBRL(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
