import { NextResponse } from "next/server";

interface Taxas {
  cdi: number;
  ipca: number;
  ibovespa: number;
  ifix: number;
  atualizadoEm: string | null;
}

let cache: { data: Taxas; ts: number } | null = null;
const TTL = 60 * 60 * 1000; // 1 hora

const FALLBACK: Taxas = { cdi: 10.5, ipca: 5.0, ibovespa: 15.0, ifix: 12.0, atualizadoEm: null };

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // SELIC meta anual (séries SGS 432) — aproxima CDI
    // IPCA acumulado 12 meses (SGS 13522)
    const [selicRes, ipcaRes] = await Promise.all([
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json", { next: { revalidate: 3600 } }),
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json", { next: { revalidate: 3600 } }),
    ]);

    if (!selicRes.ok || !ipcaRes.ok) throw new Error("Banco Central indisponível");

    const [selic, ipca] = await Promise.all([selicRes.json(), ipcaRes.json()]);
    const data: Taxas = {
      cdi: parseFloat(selic[0]?.valor ?? FALLBACK.cdi),
      ipca: parseFloat(ipca[0]?.valor ?? FALLBACK.ipca),
      ibovespa: 15.0, // média histórica 5 anos
      ifix: 12.0,     // média histórica 5 anos
      atualizadoEm: new Date().toISOString(),
    };

    cache = { data, ts: Date.now() };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
