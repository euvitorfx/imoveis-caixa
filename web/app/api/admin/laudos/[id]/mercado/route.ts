import { NextRequest, NextResponse } from "next/server";
import { getLaudoById, getLaudoComMercadoByImovel, updateLaudo } from "@/lib/laudos";
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

// Extrai nome do empreendimento/condomínio para apartamentos
// Ex: "RESIDENCIAL HARPIA BLOCOS A/B APTO 101" → "Harpia"
// Ex: "CONDOMINIO TAMAN RUA X" → "Taman"
function extraiCondominio(
  d: Record<string, unknown>,
  imovelDescricao?: string
): string {
  // 1. Campos dedicados
  const campos = [d.empreendimento, d.condominio, d.nomeCondominio, d.nomeCond];
  for (const c of campos) {
    const v = String(c ?? "").trim();
    if (v && v.length > 2 && v.toLowerCase() !== "undefined") return toTitleCase(v);
  }

  // 2. Extrai de d.descricao: "RESIDENCIAL HARPIA ...", "CONDOMINIO TAMAN ..."
  const descricoes = [d.descricao, d.descricaoImovel, imovelDescricao];
  for (const raw of descricoes) {
    if (!raw) continue;
    const txt = String(raw);
    const m = txt.match(
      /(?:residencial|condom[ií]nio|empreendimento|edificio|ed\.?|conjunto)\s+([\wÀ-ž]+)/i
    );
    if (m && m[1].length > 2) return toTitleCase(m[1]);
  }

  return "";
}

// areaRef: se fornecida, valida preço/m² entre R$1.500 e R$45.000
function parsePreco(text: string, areaRef?: number): number | undefined {
  const m = text.match(/R\$\s*([\d.]+)(?:,(\d+))?/);
  if (!m) return undefined;
  const intPart = parseInt(m[1].replace(/\./g, ""), 10);
  if (intPart < 50000 || intPart > 15000000) return undefined;
  if (areaRef && areaRef > 0) {
    const precoM2 = intPart / areaRef;
    if (precoM2 < 1500 || precoM2 > 45000) return undefined;
  }
  return intPart;
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

// Detecta páginas de categoria/busca dos portais (não são anúncios individuais)
function isCategoryPage(item: SearchResult): boolean {
  const text = `${item.title} ${item.snippet ?? ""}`;
  if (/\b\d{3,}[\.\d]*\s+(?:im[oó]veis|aparta|casas|lotes|terrenos)\b/i.test(text)) return true;
  if (/encontre (?:o|a|seu|sua)\s+(?:im[oó]vel|apartamento|casa)/i.test(text)) return true;
  if (/(?:busque|pesquise|filtre)\s+entre/i.test(text)) return true;
  if (/imóveis à venda em\s+\w+/i.test(text) && !/R\$\s*[\d\.]+/.test(text)) return true;
  try {
    const path = new URL(item.url).pathname;
    if (/^\/imoveis\//i.test(path)) return true;
    if (/^\/(?:venda|aluguel)\/(?:apartamentos|casas|terrenos|imoveis)\//i.test(path)) return true;
    if (/^\/(?:region|comprar|alugar)\//i.test(path)) return true;
    if (/^\/(?:apartamentos|casas)\//i.test(path)) return true;
  } catch { /* URL inválida */ }
  return false;
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

// ── Serper.dev (Google results) ───────────────────────────────────────────────

interface SerperOrganic {
  title: string;
  link: string;
  displayLink?: string;
  snippet?: string;
  date?: string;
}

async function buscaSerper(query: string, apiKey: string): Promise<SearchResponse> {
  const r = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl: "br", hl: "pt", num: 10 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) return { results: [], error: `Serper HTTP ${r.status}` };
  const json = await r.json() as { organic?: SerperOrganic[]; error?: string };
  if (json.error) return { results: [], error: json.error };
  return {
    results: (json.organic ?? []).map((it) => ({
      title:        it.title,
      url:          it.link,
      displayLink:  it.displayLink ?? new URL(it.link).hostname,
      snippet:      it.snippet,
      publishedDate: it.date,
    })),
  };
}

// ── Motor de busca unificado ─────────────────────────────────────────────────

async function busca(query: string): Promise<SearchResponse> {
  const serperKey = process.env.SERPER_API_KEY;
  const googleKey = process.env.GOOGLE_CSE_API_KEY;
  const cseId     = process.env.GOOGLE_CSE_ID;

  if (serperKey) return buscaSerper(query, serperKey);
  if (googleKey && cseId) return buscaGoogle(query, googleKey, cseId);
  return { results: [], error: "Nenhuma chave de busca configurada (SERPER_API_KEY ou GOOGLE_CSE_API_KEY)" };
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

// Aceita lista de anúncios já coletados externamente (ex: busca manual via Claude)
export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  const body = await req.json() as { anuncios: AnuncioComparavel[] };
  if (!Array.isArray(body.anuncios)) {
    return NextResponse.json({ error: "anuncios deve ser array" }, { status: 400 });
  }

  const anuncios: AnuncioComparavel[] = body.anuncios;

  const d = laudo.imovelData as Record<string, unknown>;
  const area = Number(d.areaUtil ?? d.areaTotal ?? 0) || undefined;

  const precos = anuncios.map((a) => a.preco).filter((p): p is number => p != null);
  const stats: AvaliacaoMercado["stats"] = precos.length > 0
    ? {
        min:     Math.min(...precos),
        max:     Math.max(...precos),
        mediana: calcMediana(precos),
        total:   anuncios.length,
        precoM2: area && precos.length > 0
          ? Math.round(calcMediana(precos) / area)
          : undefined,
      }
    : undefined;

  const avaliacaoMercado: AvaliacaoMercado = {
    anuncios,
    buscadoEm: new Date().toISOString(),
    source: "manual",
    stats,
  };

  await updateLaudo(id, { avaliacaoMercado } as Parameters<typeof updateLaudo>[1]);
  return NextResponse.json({ ok: true, total: anuncios.length, stats });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  const force = new URL(req.url).searchParams.get("force") === "true";

  // Protege resultados inseridos manualmente (via PUT/Claude browser)
  if (!force && laudo.avaliacaoMercado?.source === "manual") {
    return NextResponse.json(
      { ok: false, cached: true, source: "manual", message: "Análise inserida manualmente. Use ?force=true para substituir.", stats: laudo.avaliacaoMercado.stats },
      { status: 200 }
    );
  }

  // Cache: verifica se outro laudo do mesmo imóvel já tem busca recente (< 30 dias)
  if (!force && laudo.imovelId) {
    const irmao = await getLaudoComMercadoByImovel(laudo.imovelId, id);
    if (irmao?.avaliacaoMercado) {
      // Copia o resultado do laudo irmão para este laudo
      await updateLaudo(id, { avaliacaoMercado: irmao.avaliacaoMercado } as Parameters<typeof updateLaudo>[1]);
      return NextResponse.json({
        ok: true, cached: true, total: irmao.avaliacaoMercado.anuncios.length,
        stats: irmao.avaliacaoMercado.stats,
        message: `Reutilizado do laudo #${irmao.numero ?? irmao._id} (${irmao.avaliacaoMercado.buscadoEm?.slice(0, 10)})`,
      });
    }
  }

  const d = laudo.imovelData as Record<string, unknown>;
  const tipo     = normalizaTipo(String(d.tipo    ?? "imóvel"));
  const cidade   = toTitleCase(String(d.cidade   ?? ""));
  const estado   = String(d.estado ?? "").toUpperCase();
  const bairro   = toTitleCase(String(d.bairro   ?? ""));
  const endereco = String(d.endereco ?? "");
  const area     = Number(d.areaUtil ?? d.areaTotal ?? 0) || undefined;
  const quartos  = Number(d.quartos  ?? 0) || undefined;

  const rua = endereco ? extraiRua(endereco) : "";
  const condominio = extraiCondominio(d, laudo.imovelDescricao);

  const queries: { q: string; relevancia: AnuncioComparavel["relevancia"] }[] = [];

  if (tipo === "apartamento") {
    // ── APARTAMENTO: prioriza nome do condomínio/empreendimento ─────────────
    // Query 1: nome do condomínio — altíssima relevância (mesmo prédio)
    if (condominio && cidade) {
      queries.push({
        q: `"${condominio}" apartamento venda ${bairro || cidade} ${estado}`,
        relevancia: "endereco",
      });
    } else if (rua && cidade) {
      // Fallback: endereço exato se condomínio não disponível
      queries.push({
        q: `"${rua}" apartamento venda ${cidade} ${estado}`,
        relevancia: "endereco",
      });
    }

    // Query 2: condomínio + portais (OLX melhor para MCMV/Tenda)
    if (condominio && cidade) {
      const portais = "site:olx.com.br OR site:zapimoveis.com.br OR site:vivareal.com.br";
      queries.push({
        q: `"${condominio}" apartamento venda ${portais}`,
        relevancia: "endereco",
      });
    }

    // Query 3: bairro com características — portais
    if (bairro && cidade) {
      const portais = "site:olx.com.br OR site:zapimoveis.com.br OR site:vivareal.com.br";
      const partes = ["apartamento", `"${bairro}"`, cidade, "venda", portais];
      if (quartos) partes.splice(2, 0, `${quartos} quartos`);
      queries.push({ q: partes.join(" "), relevancia: "bairro" });
    }

    // Query 4: bairro ampla como fallback
    if (bairro && cidade) {
      const partes = ["apartamento", `"${bairro}"`];
      if (quartos) partes.push(`${quartos} quartos`);
      if (area)    partes.push(`${Math.round(area)}m²`);
      partes.push("venda", cidade);
      queries.push({ q: partes.join(" "), relevancia: "bairro" });
    }

  } else if (tipo === "casa") {
    // ── CASA: prioriza endereço e rua ────────────────────────────────────────
    // Query 1: rua exata — máxima relevância
    if (rua && cidade) {
      queries.push({
        q: `"${rua}" casa venda ${cidade} ${estado}`,
        relevancia: "endereco",
      });
    }

    // Query 2: rua + portais
    if (rua && cidade) {
      const portais = "site:olx.com.br OR site:zapimoveis.com.br OR site:vivareal.com.br";
      queries.push({
        q: `"${rua}" casa venda ${portais}`,
        relevancia: "endereco",
      });
    }

    // Query 3: bairro com características
    if (bairro && cidade) {
      const partes = ["casa", `"${bairro}"`];
      if (quartos) partes.push(`${quartos} quartos`);
      if (area)    partes.push(`${Math.round(area)}m²`);
      partes.push("venda", cidade);
      queries.push({ q: partes.join(" "), relevancia: "bairro" });
    }

    // Query 4: região ampla como fallback
    if (cidade) {
      const partes = ["casa", bairro || cidade, cidade, "venda"];
      if (quartos) partes.push(`${quartos} quartos`);
      queries.push({ q: partes.join(" "), relevancia: "regiao" });
    }

  } else {
    // ── OUTROS TIPOS: lógica genérica ────────────────────────────────────────
    // Query 1: rua exata
    if (rua && cidade) {
      queries.push({
        q: `"${rua}" ${tipo} venda ${cidade} ${estado}`,
        relevancia: "endereco",
      });
    }

    // Query 2: bairro com características
    if (bairro && cidade) {
      const partes = [tipo, `"${bairro}"`];
      if (quartos) partes.push(`${quartos} quartos`);
      if (area)    partes.push(`${Math.round(area)}m²`);
      partes.push("venda", cidade);
      queries.push({ q: partes.join(" "), relevancia: "bairro" });
    }

    // Query 3: portais específicos
    if (cidade) {
      const localidade = bairro ? `"${bairro}" ${cidade}` : cidade;
      const portais = "site:olx.com.br OR site:zapimoveis.com.br OR site:vivareal.com.br";
      const partes = [tipo, localidade, "venda", portais];
      if (quartos) partes.splice(2, 0, `${quartos} quartos`);
      queries.push({ q: partes.join(" "), relevancia: "bairro" });
    }

    // Query 4: região ampla
    if (cidade) {
      const partes = [tipo, bairro || cidade, cidade, "venda"];
      if (quartos) partes.push(`${quartos} quartos`);
      if (area)    partes.push(`${Math.round(area)}m²`);
      queries.push({ q: partes.join(" "), relevancia: "regiao" });
    }
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
      if (isCategoryPage(item)) continue;
      seenUrls.add(item.url);

      const texto = `${item.title} ${item.snippet ?? ""}`;
      const anuncio: AnuncioComparavel = {
        titulo:          item.title.split(" - ")[0].trim(),
        url:             item.url,
        fonte:           fonteFromLink(item.displayLink),
        preco:           parsePreco(texto, area),
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

  // Remove outliers de preço: descarta valores > 3.5x ou < 1/3.5 da mediana
  const precosParaOutlier = anuncios.map(a => a.preco).filter((p): p is number => p != null);
  if (precosParaOutlier.length >= 3) {
    const med = calcMediana(precosParaOutlier);
    for (const a of anuncios) {
      if (a.preco != null && (a.preco > med * 3.5 || a.preco < med / 3.5)) {
        a.preco = undefined;
      }
    }
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
    source: "automatico",
    stats,
  };

  await updateLaudo(id, { avaliacaoMercado } as Parameters<typeof updateLaudo>[1]);
  return NextResponse.json({ ok: true, total: anuncios.length, stats });
}
