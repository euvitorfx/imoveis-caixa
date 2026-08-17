export interface DadosAnalise {
  nome: string;
  // Imóvel
  valorAvaliacao: number;
  valorMercado: number;
  lanceInicial: number;
  // Aquisição (% armazenados como valor inteiro: 5 = 5%)
  valorCompra: number;
  percLeiloeiro: number;
  dividaCondominio: number;
  iptu: number;
  percEscritura: number;
  percITBI: number;
  percRegistro: number;
  imissaoPosse: number;
  reforma: number;
  areaNaoAverbada: number;
  contabilidade: number;
  anunciosPagos: number;
  // Manutenção
  mesesAteVenda: number;
  condominioMensal: number;
  energiaMensal: number;
  aguaMensal: number;
  // Venda
  valorVenda: number;
  percCorretor: number;
  percIR: number;
}

export interface ResultadoAnalise {
  leiloeiro: number;
  escritura: number;
  itbi: number;
  registro: number;
  totalAquisicao: number;
  totalManutencao: number;
  totalDespesas: number;
  corretagem: number;
  saldoPosVenda: number;
  ir: number;
  lucroLiquido: number;
  roi: number;
  roiMensal: number;
  roiPorMes: { mes: number; roi: number; lucro: number }[];
}

export interface AnaliseViabilidade {
  _id?: string;
  userId?: string;
  nome: string;
  criadaEm?: string;
  atualizadaEm?: string;
  imovelRef?: { hdnImovel: string; endereco: string; cidade: string; estado: string };
  dados: DadosAnalise;
}

export const DADOS_PADRAO: DadosAnalise = {
  nome: "",
  valorAvaliacao: 0,
  valorMercado: 0,
  lanceInicial: 0,
  valorCompra: 0,
  percLeiloeiro: 5,
  dividaCondominio: 0,
  iptu: 0,
  percEscritura: 3,
  percITBI: 2.5,
  percRegistro: 3,
  imissaoPosse: 0,
  reforma: 0,
  areaNaoAverbada: 0,
  contabilidade: 0,
  anunciosPagos: 0,
  mesesAteVenda: 6,
  condominioMensal: 0,
  energiaMensal: 0,
  aguaMensal: 0,
  valorVenda: 0,
  percCorretor: 6,
  percIR: 15,
};

export function calcular(d: DadosAnalise): ResultadoAnalise {
  const p = (v: number) => v / 100;

  const leiloeiro = d.valorCompra * p(d.percLeiloeiro);
  const escritura = d.valorCompra * p(d.percEscritura);
  const itbi      = d.valorCompra * p(d.percITBI);
  const registro  = d.valorCompra * p(d.percRegistro);

  const totalAquisicao =
    d.valorCompra + leiloeiro + d.dividaCondominio + d.iptu +
    escritura + itbi + registro + d.imissaoPosse + d.reforma +
    d.areaNaoAverbada + d.contabilidade + d.anunciosPagos;

  const manutMensal    = d.condominioMensal + d.energiaMensal + d.aguaMensal;
  const totalManutencao = manutMensal * d.mesesAteVenda;
  const totalDespesas   = totalAquisicao + totalManutencao;

  const corretagem   = d.valorVenda * p(d.percCorretor);
  const saldoPosVenda = d.valorVenda - totalDespesas - corretagem;
  const ir            = saldoPosVenda > 0 ? saldoPosVenda * p(d.percIR) : 0;
  const lucroLiquido  = saldoPosVenda - ir;

  const roi      = totalAquisicao > 0 ? (lucroLiquido / totalAquisicao) * 100 : 0;
  const roiMensal = d.mesesAteVenda > 0 ? roi / d.mesesAteVenda : 0;

  const meses = Math.max(Math.round(d.mesesAteVenda), 1);
  const roiPorMes = Array.from({ length: meses }, (_, i) => {
    const mes    = i + 1;
    const manut  = manutMensal * mes;
    const desp   = totalAquisicao + manut;
    const saldo  = d.valorVenda - desp - corretagem;
    const irM    = saldo > 0 ? saldo * p(d.percIR) : 0;
    const lucro  = saldo - irM;
    const roiM   = totalAquisicao > 0 ? (lucro / totalAquisicao) * 100 : 0;
    return { mes, roi: roiM, lucro };
  });

  return { leiloeiro, escritura, itbi, registro, totalAquisicao, totalManutencao, totalDespesas, corretagem, saldoPosVenda, ir, lucroLiquido, roi, roiMensal, roiPorMes };
}

// Dado um ROI alvo (%), retorna o valorCompra máximo que ainda atinge esse ROI.
// Derivado analiticamente da fórmula: roi = lucroLiquido / totalAquisicao * 100
export function calcularLanceMaximo(d: DadosAnalise, roiAlvo: number): number {
  const pC = d.percCorretor / 100;
  const pI = d.percIR / 100;
  const r  = roiAlvo / 100;
  // k = multiplicador do lance (1 + todas as % sobre valorCompra)
  const k  = 1 + (d.percLeiloeiro + d.percEscritura + d.percITBI + d.percRegistro) / 100;
  // custos fixos que não dependem do lance
  const FC = d.dividaCondominio + d.iptu + d.imissaoPosse + d.reforma +
             d.areaNaoAverbada + d.contabilidade + d.anunciosPagos;
  const TM = (d.condominioMensal + d.energiaMensal + d.aguaMensal) * d.mesesAteVenda;
  // S = receita líquida de venda menos custos fixos (sem o lance)
  const S = d.valorVenda * (1 - pC) - FC - TM;
  const denom = k * (1 - pI + r);
  if (denom <= 0 || d.valorVenda <= 0) return 0;
  return Math.max(0, (S * (1 - pI) - r * FC) / denom);
}

export function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
