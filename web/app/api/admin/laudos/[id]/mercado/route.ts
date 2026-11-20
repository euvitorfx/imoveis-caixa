import { NextRequest, NextResponse } from "next/server";
import { getLaudoById, updateLaudo } from "@/lib/laudos";
import type { AnuncioComparavel, AvaliacaoMercado } from "@/lib/laudos-types";

type Ctx = { params: Promise<{ id: string }> };

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bDe\b|\bDa\b|\bDo\b|\bDas\b|\bDos\b|\bE\b/g, (s) => s.toLowerCase());
}

function normalizaTipo(tipo: string): string {
  const t = tipo.toLowerCase();
  if (t.includes("apart") || t === "ap") return "apartamento";
  if (t.includes("casa") || t === "ca") return "casa";
  if (t.includes("terreno") || t.includes("lote") || t === "te") return "terreno";
  if (t.includes("loja") || t === "lj") return "loja";
  if (t.includes("galpao") || t.includes("galpão") || t === "ga") return "galpão";
  if (t.includes("sala") || t === "sl") return "sala comercial";
  return tipo.toLowerCase();
}

function extraiRua(endereco: string): string {
  // "RUA PADRE ESTEVAO PERNET, 55 APTO 22 - TATUAPE" → "RUA PADRE ESTEVAO PERNET"
  return endereco.split(",")[0].trim();
}

function parsePreco(text: string): number | undefined {
  const m = text.match(/R\$\s*([\d.]+)(?:,(\d+))?/);
  if (!m) return undefined;
  const intPart = parseInt(m[1].replace(/\./g, ""), 10);
  if (intPart >= 50000 && intPart <= 15000000) return intPart;
  return undefined;
}

function parseArea(text: string): number | undefined {
  const m = text.match(/(\d{2,4})\s*m[²2]/i);
  if (!m) return undefined;
  const v = parseInt(m[1], 10);
  if (v >= 10 && v <= 5000) return v;
  return undefined;
}

function parseQuartos(text: string): number | undefined {
  const m = text.match(/(\d)\s*quarto/i);
  if (!m) return undefined;
  const v = parseInt(m[1], 10);
  if (v >= 1 && v <= 20) return v;
  return undefined;
}

function parseDataStr(isoRaw: string): string | undefined {
  const d = new Date(isoRaw);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function parseDataFromText(text: string): string | undefined {
  const now = Date.now();
  const m1 = text.match(/h[aá]\s+(\d+)\s+dia/i);
  if (m1) return new Date(now - parseInt(m1[1]) * 86400000).toISOString();
  const m2 = text.match(/h[aá]\s+(\d+)\s+semana/i);
  if (m2) return new Date(now - parseInt(m2[1]) * 7 * 86400000).toISOString();
  const m3 = text.match(/h[aá]\s+(\d+)\s+m[eê]s/i);
  if (m3) return new Date(now - parseInt(m3[1]) * 30 * 86400000).toISOString();
  const m4 = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m4) {
    const d = new Date(`${m4[3]}-${m4[2]}-${m4[1]}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return undefined;
}

const FONTE_MAP: Record<string, string> = {
  "zapimoveis.com.br":        "ZAP Imóveis",
  "vivareal.com.br":          "VivaReal",
  "olx.com.br":               "OLX",
  "imovelweb.com.br":         "Imovelweb",
  "chavenamao.com.br":        "Chave na Mão",
  "loft.com.br":              "Loft",
  "mercadolivre.com.br":      "Mercado Livre",
  "produto.mercadolivre.com.br": "Mercado Livre",
  "remax.com.br":             "Re/Max",
  "quintoandar.com.br":       "QuintoAndar",
  "123i.com.br":              "123i",
  "trovit.com.br":            "Trovit",
  "wimoveis.com.br":          "wimoveis",
  "brasimoveis.com.br":       "BrasImóveis",
  "facebook.com":             "Facebook",
};

function fonteFromLink(displayLink: string): string {
  const host = displayLink.replace(/^www\./, "");
  return FONTE_MAP[host] ?? displayLink;
}

// ── Tipos de resultado de busca ───────────────────────────────────────────────

interface SearchResult {
  title: string;
  url: string;
  displayLink: string;
  snippet?: string;
  publishedDate?: string;
}

type SearchResponse = { results: SearchResult[]; error?: string };

// ── Google CSE ───────────────────────────────────────────────────────────────

interface GoogleItem {
  title: string;
  link: string;
  displayLink: string;
  snippet?: string;
  pagemap?: { metatags?: Record<string, string>[] };
}

async function buscaGoogle(
  query: string,
  apiKey: string,
  cseId: string
): Promise<SearchResponse> {
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&num=10`;
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const json = await r.json() as { items?: GoogleItem[]; error?: { message: string } };
  if (!r.ok) return { results: [], error: json.error?.message ?? `HTTP ${r.status}` };
  return {
    results: (json.items ?? []).map((it) => ({
      title:       it.title,
      url:         it.link,
      displayLink: it.displayLink,
      snippet:     it.snippet,
      publishedDate: it.pagemap?.metatags?.[0]?.["article:published_time"]
        ?? it.pagemap?.metatags?.[0]?.["og:updated_time"],
    })),
  };
}

// ── Brave Search ─────────────────────────────────────────────────────────────

interface BraveWeb { results?: BraveResult[] }
interface BraveResult {
  title: string;
  url: string;
  meta_url?: { hostname?: string };
  description?: string;
  page_age?: string;
}

async function buscaBrave(query: string, apiKey: string): Promise<SearchResponse> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&country=BR&search_lang=pt`;
  const r = await fetch(url, {
    headers: { "X-Subscription-Token": apiKey, "Accept": "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) return { results: [], error: `Brave HTTP ${r.status}` };
  const json = await r.json() as { web?: BraveWeb; error?: { message?: string } };
  const items = json.web?.results ?? [];
  return {
    results: items.map((it) => ({
      title:        it.title,
      url:          it.url,
      displayLink:  it.meta_url?.hostname ?? new URL(it.url).hostname,
      snippet:      it.description,
      publishedDate: it.page_age,
    })),
  };
}

// ── Motor de busca unificado ─────────────────────────────────────────────────

async function busca(query: string): Promise<SearchResponse> {
  const braveKey  = process.env.BRAVE_SEARCH_API_KEY;
  const googleKey = process.env.GOOGLE_CSE_API_KEY;
  const cseId     = process.env.GOOGLE_CSE_ID;

  if (braveKey) return buscaBrave(query, braveKey);
  if (googleKey && cseId) return buscaGoogle(query, googleKey, cseId);
  return { results: [], error: "Nenhuma chave de busca configurada (BRAVE_SEARCH_API_KEY ou GOOGLE_CSE_API_KEY)" };
}

function calcMediana(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });
  return NextResponse.json(laudo.avaliacaoMercado ?? null);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  const d = laudo.imovelData as Record<string, unknown>;
  const tipo     = normalizaTipo(String(d.tipo    ?? "imóvel"));
  const cidade   = toTitleCase(String(d.cidade   ?? ""));
  const estado   = String(d.estado ?? "").toUpperCase();
  const bairro   = toTitleCase(String(d.bairro   ?? ""));
  const endereco = String(d.endereco ?? "");
  const area     = Number(d.areaUtil ?? d.areaTotal ?? 0) || undefined;
  const quartos  = Number(d.quartos  ?? 0) || undefined;

  const rua = endereco ? extraiRua(endereco) : "";

  // 3 queries progressivas
  const queries: { q: string; relevancia: AnuncioComparavel["relevancia"] }[] = [];

  if (rua && cidade) {
    queries.push({
      q: `"${rua}" ${tipo} venda ${cidade} ${estado}`,
      relevancia: "endereco",
    });
  }
  if (bairro && cidade) {
    const partes = [`${tipo}`, `"${bairro}"`];
    if (quartos) partes.push(`${quartos} quartos`);
    if (area)    partes.push(`${Math.round(area)}m²`);
    partes.push("venda", cidade);
    queries.push({ q: partes.join(" "), relevancia: "bairro" });
  }
  if (cidade) {
    queries.push({
      q: `${tipo} ${bairro || cidade} ${cidade} venda`,
      relevancia: "regiao",
    });
  }

  // Executa queries e deduplica por URL
  const seenUrls = new Set<string>();
  const anuncios: AnuncioComparavel[] = [];
  let apiError: string | undefined;

  for (const { q, relevancia } of queries) {
    const { results, error } = await busca(q);
    if (error && !apiError) apiError = error;
    for (const item of results) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);

      const texto = `${item.title} ${item.snippet ?? ""}`;
      const anuncio: AnuncioComparavel = {
        titulo:          item.title.split(" - ")[0].trim(),
        url:             item.url,
        fonte:           fonteFromLink(item.displayLink),
        preco:           parsePreco(texto),
        area:            parseArea(texto) ?? area,
        quartos:         parseQuartos(texto) ?? quartos,
        dataPublicacao:  item.publishedDate ? parseDataStr(item.publishedDate) : parseDataFromText(texto),
        relevancia,
      };
      anuncios.push(anuncio);
    }
    // Respeita cota da API: pausa entre queries
    await new Promise((r) => setTimeout(r, 300));
  }

  if (apiError && anuncios.length === 0) {
    return NextResponse.json({ error: `Google CSE: ${apiError}` }, { status: 502 });
  }

  // Calcula estatísticas com base nos anúncios que têm preço
  const precos = anuncios.map((a) => a.preco).filter((p): p is number => p != null);
  const stats: AvaliacaoMercado["stats"] = precos.length > 0
    ? {
        min:    Math.min(...precos),
        max:    Math.max(...precos),
        mediana: calcMediana(precos),
        total:  anuncios.length,
        precoM2: area && precos.length > 0
          ? Math.round(calcMediana(precos) / area)
          : undefined,
      }
    : undefined;

  const avaliacaoMercado: AvaliacaoMercado = {
    anuncios,
    buscadoEm: new Date().toISOString(),
    stats,
  };

  await updateLaudo(id, { avaliacaoMercado } as Parameters<typeof updateLaudo>[1]);
  return NextResponse.json({ ok: true, total: anuncios.length, stats });
}
