export interface Imovel {
  _id: string;
  hdnImovel: string;
  estado: string;
  cidade: string;
  bairro: string;
  endereco: string;
  preco: number | null;
  precoAval: number | null;
  desconto: number | null;
  financiamento: string;
  modalidade: string;
  urlDetalhe: string;
  fotoUrl?: string;
  tipo?: string;
  areaTotal?: number;
  areaUtil?: number;
  areaTerreno?: number;
  quartos?: number;
  vagas?: number;
  ativo: boolean;
  lat?: number;
  lng?: number;
}

export interface FiltrosImovel {
  estado?: string;
  cidade?: string;
  tipo?: string;
  modalidade?: string;
  precoMin?: number;
  precoMax?: number;
  quartos?: number;
  vagas?: number;
  financiamento?: string;
  page?: number;
  limit?: number;
}
