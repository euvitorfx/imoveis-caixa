"use client";

import { useSearchParams } from "next/navigation";
import AnaliseForm from "../AnaliseForm";
import { DADOS_PADRAO } from "@/lib/analises";

export default function AnaliseFormWrapper() {
  const params = useSearchParams();

  const preco     = parseFloat(params.get("preco") ?? "0") || 0;
  const precoAval = parseFloat(params.get("precoAval") ?? "0") || 0;
  const hdnImovel = params.get("hdnImovel") ?? undefined;
  const endereco  = decodeURIComponent(params.get("endereco") ?? "");
  const cidade    = decodeURIComponent(params.get("cidade") ?? "");
  const estado    = params.get("estado") ?? "";

  const inicial = {
    nome: hdnImovel && cidade ? `Imóvel · ${cidade}/${estado}` : "",
    imovelRef: hdnImovel ? { hdnImovel, endereco, cidade, estado } : undefined,
    dados: {
      ...DADOS_PADRAO,
      valorAvaliacao: precoAval,
      lanceInicial: preco,
      valorCompra: preco,
    },
  };

  return <AnaliseForm inicial={inicial} />;
}
