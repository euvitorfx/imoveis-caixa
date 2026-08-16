const NAVY  = "#01304D";
const AMBER = "#F59E0B";
const GRAY  = "#6b7280";
const WHITE = "#ffffff";

export function emailBoasVindas(nome: string): { subject: string; html: string } {
  const primeiroNome = nome.split(" ")[0];

  const html = `<!DOCTYPE html>
<html lang="pt-BR" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>Bem-vindo ao Busca Leilões Caixa</title>
  <style>
    /* ── Reset ── */
    body, table, td { margin:0; padding:0; border-collapse:collapse; }

    /* ── Light mode (padrão) ── */
    .email-wrapper { background-color: #f3f4f6; }
    .card-header   { background-color: ${NAVY}; }
    .card-body     { background-color: ${WHITE}; }
    .card-footer   { background-color: ${NAVY}; }
    .feature-box   { background-color: #f3f4f6; }
    .body-text     { color: ${GRAY}; }
    .title-text    { color: ${NAVY}; }
    .divider       { border-color: #e5e7eb; }

    /* ── Dark mode ── */
    @media (prefers-color-scheme: dark) {
      .email-wrapper { background-color: #0f172a !important; }
      .card-header   { background-color: #0a2035 !important; }
      .card-body     { background-color: #1e293b !important; }
      .card-footer   { background-color: #0a2035 !important; }
      .feature-box   { background-color: #0f172a !important; }
      .body-text     { color: #94a3b8 !important; }
      .title-text    { color: #e2e8f0 !important; }
      .divider       { border-color: #334155 !important; }
    }

    /* ── Gmail dark mode (Android) ── */
    [data-ogsc] .email-wrapper { background-color: #0f172a !important; }
    [data-ogsc] .card-header   { background-color: #0a2035 !important; }
    [data-ogsc] .card-body     { background-color: #1e293b !important; }
    [data-ogsc] .card-footer   { background-color: #0a2035 !important; }
    [data-ogsc] .feature-box   { background-color: #0f172a !important; }
    [data-ogsc] .body-text     { color: #94a3b8 !important; }
    [data-ogsc] .title-text    { color: #e2e8f0 !important; }
    [data-ogsc] .divider       { border-color: #334155 !important; }
  </style>
</head>
<body class="email-wrapper" style="margin:0;padding:0;background-color:#f3f4f6;">

  <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0"
    bgcolor="#f3f4f6" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td class="card-header" bgcolor="${NAVY}"
              style="background-color:${NAVY};border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              <img
                src="https://www.buscaleiloescaixa.com.br/logo.png"
                alt="Busca Leilões Caixa"
                width="180"
                style="display:block;margin:0 auto;max-width:180px;height:auto;border:0;"
              />
            </td>
          </tr>

          <!-- Faixa âmbar -->
          <tr>
            <td bgcolor="${AMBER}" height="4"
              style="background-color:${AMBER};height:4px;line-height:4px;font-size:1px;"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="card-body" bgcolor="${WHITE}"
              style="background-color:${WHITE};padding:36px 32px;">

              <h1 class="title-text"
                style="margin:0 0 8px;font-size:24px;font-weight:700;color:${NAVY};line-height:1.3;">
                Seja bem-vindo, ${primeiroNome}!
              </h1>
              <p class="body-text"
                style="margin:0 0 24px;font-size:15px;color:${GRAY};line-height:1.6;">
                Sua conta no
                <strong class="title-text" style="color:${NAVY};">Busca Leilões Caixa</strong>
                foi criada com sucesso. Agora você tem acesso a ferramentas exclusivas
                para encontrar e analisar imóveis da Caixa Econômica Federal.
              </p>

              <!-- Feature list -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td class="feature-box" bgcolor="#f3f4f6"
                    style="background-color:#f3f4f6;border-radius:10px;padding:16px 20px;border-left:4px solid ${AMBER};">
                    <div class="title-text"
                      style="font-size:12px;font-weight:700;color:${NAVY};margin-bottom:12px;text-transform:uppercase;letter-spacing:.07em;">
                      O que está disponível para você
                    </div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td class="divider"
                          style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                          <span class="title-text"
                            style="color:${NAVY};font-size:14px;font-weight:600;">&#9829; Favoritos</span>
                          <div class="body-text"
                            style="font-size:12px;color:${GRAY};margin-top:2px;">
                            Salve e acompanhe imóveis de interesse
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td class="divider"
                          style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                          <span class="title-text"
                            style="color:${NAVY};font-size:14px;font-weight:600;">&#128202; Planilha de Viabilidade</span>
                          <div class="body-text"
                            style="font-size:12px;color:${GRAY};margin-top:2px;">
                            Calcule ROI, simule financiamento e exporte em XLS
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span class="title-text"
                            style="color:${NAVY};font-size:14px;font-weight:600;">&#128196; Exportar PDF</span>
                          <div class="body-text"
                            style="font-size:12px;color:${GRAY};margin-top:2px;">
                            Baixe a ficha completa com fotos de qualquer imóvel
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="https://www.buscaleiloescaixa.com.br"
                      style="display:inline-block;background-color:${NAVY};color:${WHITE};font-size:15px;font-weight:700;text-decoration:none;padding:13px 36px;border-radius:8px;border-bottom:3px solid ${AMBER};">
                      Explorar imóveis &#8594;
                    </a>
                  </td>
                </tr>
              </table>

              <p class="body-text"
                style="margin:0;font-size:13px;color:${GRAY};line-height:1.6;">
                Configure suas
                <a href="https://www.buscaleiloescaixa.com.br/perfil"
                  style="color:${NAVY};font-weight:600;text-decoration:underline;">preferências de localização</a>
                e receba <strong class="title-text" style="color:${NAVY};">alertas diários por e-mail</strong>
                sempre que novos imóveis da sua região aparecerem no acervo.
              </p>

            </td>
          </tr>

          <!-- Faixa âmbar inferior -->
          <tr>
            <td bgcolor="${AMBER}" height="4"
              style="background-color:${AMBER};height:4px;line-height:4px;font-size:1px;"></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="card-footer" bgcolor="${NAVY}"
              style="background-color:${NAVY};border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.55);">
                Busca Leilões Caixa &middot; Dados obtidos diariamente do site oficial da Caixa Econômica Federal.
              </p>
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.55);">
                Dúvidas?
                <a href="mailto:atendimento@buscaleiloescaixa.com.br"
                  style="color:${AMBER};text-decoration:none;font-weight:600;">
                  atendimento@buscaleiloescaixa.com.br
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

  return {
    subject: `Bem-vindo ao Busca Leilões Caixa, ${primeiroNome}!`,
    html,
  };
}
