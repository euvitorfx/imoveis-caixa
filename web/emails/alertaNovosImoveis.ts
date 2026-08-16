const SITE_URL = "https://www.buscaleiloescaixa.com.br";
const NAVY = "#01304D";
const AMBER = "#F59E0B";
const GRAY = "#6b7280";
const WHITE = "#ffffff";

export type ImovelPreview = {
  hdnImovel: string;
  tipo?: string;
  cidade?: string;
  estado?: string;
  preco?: number;
  areaTotal?: number;
  bairro?: string;
  modalidade?: string;
};

type Prefs = { brasil?: boolean; estados?: string[]; cidades?: string[] };

function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function toTitleCase(s: string): string {
  const minors = new Set(["de", "da", "do", "das", "dos", "e", "a", "o"]);
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i === 0 || !minors.has(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function slugify(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildVerMaisUrl(prefs: Prefs): string {
  if (prefs.brasil) return SITE_URL;
  const estados = prefs.estados ?? [];
  const cidades = prefs.cidades ?? [];
  if (cidades.length === 1) {
    const [cidade, uf] = cidades[0].split("|");
    return `${SITE_URL}/imoveis/${uf}/${slugify(cidade)}`;
  }
  if (estados.length === 1 && cidades.length === 0) {
    return `${SITE_URL}/imoveis/${estados[0]}`;
  }
  return SITE_URL;
}

function cardHtml(imovel: ImovelPreview): string {
  const url = `${SITE_URL}/imovel/${imovel.hdnImovel}`;
  const label = [imovel.tipo, imovel.modalidade].filter(Boolean).join(" · ");
  const localParts = [
    imovel.cidade ? toTitleCase(imovel.cidade) : null,
    imovel.estado,
  ].filter(Boolean);
  const local = localParts.join(", ");
  const bairro = imovel.bairro ? ` — ${toTitleCase(imovel.bairro)}` : "";
  const preco = imovel.preco ? fmtBRL(imovel.preco) : "Consultar";
  const area = imovel.areaTotal ? `${imovel.areaTotal.toLocaleString("pt-BR")} m²` : "";

  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
  <tr>
    <td style="background-color:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;">
      ${label ? `<div style="font-size:11px;color:${GRAY};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">${label}</div>` : ""}
      <div style="font-size:14px;font-weight:600;color:${NAVY};margin-bottom:2px;">${local}${bairro}</div>
      <div style="font-size:19px;font-weight:700;color:${AMBER};margin-bottom:6px;">${preco}${area ? `<span style="font-size:12px;font-weight:400;color:${GRAY};margin-left:8px;">${area}</span>` : ""}</div>
      <a href="${url}" style="font-size:12px;font-weight:600;color:${NAVY};text-decoration:underline;">Ver imóvel &rarr;</a>
    </td>
  </tr>
</table>`;
}

export function emailAlertaNovos({
  nome,
  imoveis,
  total,
  prefs,
}: {
  nome: string;
  imoveis: ImovelPreview[];
  total: number;
  prefs: Prefs;
}): { subject: string; html: string } {
  const primeiroNome = (nome ?? "").split(" ")[0] || "usuário";
  const n = imoveis.length;
  const verMaisUrl = buildVerMaisUrl(prefs);
  const hasMore = total > 20;

  const subject = `${n} novo${n !== 1 ? "s" : ""} imóvel${n !== 1 ? "is" : ""} na sua região — Busca Leilões Caixa`;

  const cards = imoveis.map(cardHtml).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta name="color-scheme" content="light dark"/>
  <style>
    body,table,td{margin:0;padding:0;border-collapse:collapse;}
    .email-wrapper{background-color:#f3f4f6;}
    .card-header{background-color:${NAVY};}
    .card-body{background-color:${WHITE};}
    .card-footer{background-color:${NAVY};}
    .body-text{color:${GRAY};}
    .title-text{color:${NAVY};}
    @media(prefers-color-scheme:dark){
      .email-wrapper{background-color:#0f172a!important;}
      .card-header{background-color:#0a2035!important;}
      .card-body{background-color:#1e293b!important;}
      .card-footer{background-color:#0a2035!important;}
      .body-text{color:#94a3b8!important;}
      .title-text{color:#e2e8f0!important;}
    }
    [data-ogsc] .email-wrapper{background-color:#0f172a!important;}
    [data-ogsc] .card-header{background-color:#0a2035!important;}
    [data-ogsc] .card-body{background-color:#1e293b!important;}
    [data-ogsc] .card-footer{background-color:#0a2035!important;}
    [data-ogsc] .body-text{color:#94a3b8!important;}
    [data-ogsc] .title-text{color:#e2e8f0!important;}
  </style>
</head>
<body class="email-wrapper" style="margin:0;padding:0;background-color:#f3f4f6;">
  <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f3f4f6" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <!-- Header -->
        <tr>
          <td class="card-header" bgcolor="${NAVY}" style="background-color:${NAVY};border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
            <img src="https://www.buscaleiloescaixa.com.br/logo.png" alt="Busca Leilões Caixa" width="180" style="display:block;margin:0 auto;max-width:180px;height:auto;border:0;"/>
          </td>
        </tr>
        <tr><td bgcolor="${AMBER}" height="4" style="background-color:${AMBER};height:4px;line-height:4px;font-size:1px;"></td></tr>

        <!-- Body -->
        <tr>
          <td class="card-body" bgcolor="${WHITE}" style="background-color:${WHITE};padding:28px 32px;">
            <h1 class="title-text" style="margin:0 0 6px;font-size:22px;font-weight:700;color:${NAVY};line-height:1.3;">
              ${n} novo${n !== 1 ? "s" : ""} imóvel${n !== 1 ? "is" : ""} encontrado${n !== 1 ? "s" : ""}!
            </h1>
            <p class="body-text" style="margin:0 0 20px;font-size:14px;color:${GRAY};line-height:1.6;">
              Olá, <strong>${primeiroNome}</strong>. Encontramos imóveis novos que correspondem às suas preferências.
            </p>

            <!-- Property cards -->
            ${cards}

            ${hasMore ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;margin-bottom:20px;">
              <tr>
                <td style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;text-align:center;">
                  <p style="margin:0;font-size:13px;color:#92400e;">
                    Há <strong>${total}</strong> imóveis no total na sua região.
                    <a href="${verMaisUrl}" style="color:${NAVY};font-weight:600;text-decoration:underline;margin-left:4px;">Ver todos &rarr;</a>
                  </p>
                </td>
              </tr>
            </table>
            ` : ""}

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr>
                <td align="center">
                  <a href="${verMaisUrl}" style="display:inline-block;background-color:${NAVY};color:${WHITE};font-size:14px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:8px;border-bottom:3px solid ${AMBER};">
                    Explorar imóveis &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr><td bgcolor="${AMBER}" height="4" style="background-color:${AMBER};height:4px;line-height:4px;font-size:1px;"></td></tr>

        <!-- Footer -->
        <tr>
          <td class="card-footer" bgcolor="${NAVY}" style="background-color:${NAVY};border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.55);">
              Busca Leilões Caixa &middot; Dados do acervo oficial da Caixa Econômica Federal.
            </p>
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.55);">
              Para pausar estes alertas, acesse
              <a href="https://www.buscaleiloescaixa.com.br/perfil" style="color:${AMBER};text-decoration:none;font-weight:600;">suas preferências</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
