import { NextRequest, NextResponse } from "next/server";
import { Imovel } from "@/lib/types";

function checkAuth(req: NextRequest): boolean {
  const token = req.cookies.get("admin_token")?.value;
  return !!token && token === process.env.ADMIN_SECRET;
}

function fmtPreco(v: number | null): string {
  if (!v) return "a consultar";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function buildPrompt(imovel: Imovel): string {
  const partes: string[] = [];
  partes.push(`Tipo: ${imovel.tipo || "Imóvel"}`);
  partes.push(`Modalidade: ${imovel.modalidade}`);
  partes.push(`Cidade: ${imovel.cidade}, ${imovel.estado}`);
  if (imovel.bairro) partes.push(`Bairro: ${imovel.bairro}`);
  partes.push(`Preço: ${fmtPreco(imovel.preco)}`);
  if (imovel.precoAval) partes.push(`Avaliação: ${fmtPreco(imovel.precoAval)}`);
  if (imovel.desconto && imovel.desconto > 0) {
    partes.push(`Desconto: ${(imovel.desconto * 100).toFixed(0)}% abaixo da avaliação`);
  }
  if (imovel.areaTotal) partes.push(`Área total: ${imovel.areaTotal}m²`);
  if (imovel.areaUtil) partes.push(`Área útil: ${imovel.areaUtil}m²`);
  if (imovel.quartos) partes.push(`Quartos: ${imovel.quartos}`);
  if (imovel.suites) partes.push(`Suítes: ${imovel.suites}`);
  if (imovel.vagas) partes.push(`Vagas de garagem: ${imovel.vagas}`);
  if (imovel.financiamento?.toLowerCase().includes("sim")) partes.push(`Aceita financiamento: Sim`);
  if (imovel.fgts) partes.push(`Aceita FGTS: Sim`);
  if (imovel.ocupacao) partes.push(`Situação: ${imovel.ocupacao}`);
  if (imovel.descricao) partes.push(`Descrição do imóvel: ${imovel.descricao}`);

  return `Você é um especialista em marketing imobiliário para redes sociais. Escreva em português brasileiro informal, animado e persuasivo.

Dados do imóvel:
${partes.join("\n")}

Site: buscaleiloescaixa.com.br (Busca Leilões Caixa)
Programa de cashback: Clube BLC — quem compra indicando o assessor parceiro BLC recebe até 1% de cashback.

Crie duas copies:

1. **POST INSTAGRAM** (300–700 caracteres): Copy para feed com gancho forte, emojis, destaques dos pontos mais atrativos do imóvel, menção ao Clube BLC como diferencial, hashtags relevantes (#ClubeBLC #ImoveisCaixa + outros) e CTA claro ("Link na bio →").

2. **REELS/TIKTOK** (150–350 caracteres): Copy ultra-curta e impactante. Gancho em maiúsculas, 2-3 bullet points do imóvel, CTA e hashtags mínimas.

Responda APENAS com JSON válido neste exato formato (sem texto fora do JSON):
{"instagram":"...","tiktok":"..."}`;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 500 });
  }

  const { imovel } = (await req.json()) as { imovel: Imovel };

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      messages: [{ role: "user", content: buildPrompt(imovel) }],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text();
    console.error("Claude API error:", err);
    return NextResponse.json({ error: "Erro na API do Claude" }, { status: 500 });
  }

  const data = await anthropicRes.json();
  const text: string = data.content?.[0]?.text ?? "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch {
    return NextResponse.json({ instagram: text, tiktok: text });
  }
}
