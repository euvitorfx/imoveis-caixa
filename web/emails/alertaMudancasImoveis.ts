const SITE_URL = "https://www.buscaleiloescaixa.com.br";
const NAVY = "#01304D";
const AMBER = "#F59E0B";
const GRAY = "#6b7280";
const WHITE = "#ffffff";
const GREEN = "#16a34a";
const RED = "#dc2626";

const CAMPO_LABEL: Record<string, string> = {
  preco: "Preço",
  modalidade: "Modalidade",
  situacaoOcupacao: "Situação de Ocupação",
  desconto: "Desconto",
  tipo: "Tipo",
  ativo: "Status",
};

export type MudancaItem = {
  campo: string;
  de: unknown;
  para: unknown;
};

export type ImovelComMudancas = {
  imovel: {
    hdnImovel: string;
    tipo?: string;
    cidade?: string;
    estado?: string;
    preco?: number;
    bairro?: string;
    modalidade?: string;
    fotoUrl?: string;
  };
  mudancas: MudancaItem[];
};

function fmtBRL(n: unknown): string {
  if (typeof n !== "number") return String(n ?? "—");
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function fmtValor(campo: string, valor: unknown): string {
  if (campo === "preco") return fmtBRL(valor);
  if (campo === "desconto") return `${valor}%`;
  if (campo === "ativo") return valor ? "Ativo" : "Removido do acervo";
  return String(valor ?? "—");
}

function toTitleCase(s: string): string {
  const minors = new Set(["de", "da", "do", "das", "dos", "e", "a", "o"]);
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i === 0 || !minors.has(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function mudancaRow(m: MudancaItem): string {
  const label = CAMPO_LABEL[m.campo] ?? m.campo;

  if (m.campo === "ativo" && !m.para) {
    return `<tr><td style="padding:4px 0;font-size:13px;color:${RED};">⚠ <strong>Removido do acervo da Caixa</strong></td></tr>`;
  }

  const deStr = fmtValor(m.campo, m.de);
  const paraStr = fmtValor(m.campo, m.para);

  let arrow = "→";
  let cor = NAVY;
  if (m.campo === "preco" && typeof m.de === "number" && typeof m.para === "number") {
    if (m.para < m.de) { arrow = "↓"; cor = GREEN; }
    else { arrow = "↑"; cor = RED; }
  }

  return `<tr><td style="padding:4px 0;font-size:13px;color:${GRAY};">
    <strong style="color:${NAVY};">${label}:</strong>
    <span style="text-decoration:line-through;">${deStr}</span>
    &nbsp;<span style="color:${cor};font-weight:700;">${arrow} ${paraStr}</span>
  </td></tr>`;
}

function cardHtml(item: ImovelComMudancas): string {
  const { imovel, mudancas } = item;
  const url = `${SITE_URL}/imovel/${imovel.hdnImovel}`;
  const localParts = [
    imovel.cidade ? toTitleCase(imovel.cidade) : null,
    imovel.estado,
  ].filter(Boolean);
  const local = localParts.join(", ");
  const bairro = imovel.bairro ? ` — ${toTitleCase(imovel.bairro)}` : "";
  const label = [imovel.tipo, imovel.modalidade].filter(Boolean).join(" · ");

  const fotoRow = imovel.fotoUrl
    ? `<tr><td style="padding:0;line-height:0;font-size:0;"><img src="${imovel.fotoUrl}" alt="${imovel.tipo || "Imóvel"}" width="560" style="display:block;width:100%;height:160px;object-fit:cover;border-radius:7px 7px 0 0;" /></td></tr>`
    : "";

  const linhasMudancas = mudancas.map(mudancaRow).join("");

  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  ${fotoRow}
  <tr>
    <td style="background-color:#f8fafc;padding:12px 16px;">
      ${label ? `<div style="font-size:11px;color:${GRAY};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">${label}</div>` : ""}
      <div style="font-size:14px;font-weight:600;color:${NAVY};margin-bottom:8px;">${local}${bairro}</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px dashed #e5e7eb;padding-top:8px;">
        ${linhasMudancas}
      </table>
      <div style="margin-top:10px;">
        <a href="${url}" style="font-size:12px;font-weight:600;color:${NAVY};text-decoration:underline;">Ver imóvel &rarr;</a>
      </div>
    </td>
  </tr>
</table>`;
}

export function emailAlertaMudancas({
  nome,
  itens,
  descadastroUrl,
}: {
  nome: string;
  itens: ImovelComMudancas[];
  descadastroUrl?: string;
}): { subject: string; html: string } {
  const primeiroNome = (nome ?? "").split(" ")[0] || "usuário";
  const n = itens.length;
  const subject = `Atualização em ${n} imóvel${n !== 1 ? "is" : ""} que você favoritou — Busca Leilões Caixa`;
  const cards = itens.map(cardHtml).join("");

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
              Novidades nos seus favoritos
            </h1>
            <p class="body-text" style="margin:0 0 20px;font-size:14px;color:${GRAY};line-height:1.6;">
              Olá, <strong>${primeiroNome}</strong>. Detectamos alterações em ${n} imóvel${n !== 1 ? "is" : ""} que você salvou.
            </p>

            ${cards}

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr>
                <td align="center">
                  <a href="${SITE_URL}/favoritos" style="display:inline-block;background-color:${NAVY};color:${WHITE};font-size:14px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:8px;border-bottom:3px solid ${AMBER};">
                    Ver meus favoritos &rarr;
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
              ${descadastroUrl
                ? `Não quer mais receber estes alertas? <a href="${descadastroUrl}" style="color:${AMBER};text-decoration:none;font-weight:600;">Cancelar inscrição</a>`
                : `Para pausar estes alertas, acesse <a href="${SITE_URL}/perfil" style="color:${AMBER};text-decoration:none;font-weight:600;">suas preferências</a>.`
              }
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
