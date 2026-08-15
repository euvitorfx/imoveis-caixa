const NAVY  = "#01304D";
const AMBER = "#F59E0B";
const GRAY  = "#6b7280";
const WHITE = "#ffffff";

export function emailRecuperarSenha(
  nome: string,
  linkReset: string,
): { subject: string; html: string } {
  const primeiroNome = nome.split(" ")[0];

  const html = `<!DOCTYPE html>
<html lang="pt-BR" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>Recuperação de senha</title>
  <style>
    body, table, td { margin:0; padding:0; border-collapse:collapse; }
    .email-wrapper { background-color: #f3f4f6; }
    .card-header   { background-color: ${NAVY}; }
    .card-body     { background-color: ${WHITE}; }
    .card-footer   { background-color: ${NAVY}; }
    .body-text     { color: ${GRAY}; }
    .title-text    { color: ${NAVY}; }
    @media (prefers-color-scheme: dark) {
      .email-wrapper { background-color: #0f172a !important; }
      .card-header   { background-color: #0a2035 !important; }
      .card-body     { background-color: #1e293b !important; }
      .card-footer   { background-color: #0a2035 !important; }
      .body-text     { color: #94a3b8 !important; }
      .title-text    { color: #e2e8f0 !important; }
    }
    [data-ogsc] .email-wrapper { background-color: #0f172a !important; }
    [data-ogsc] .card-header   { background-color: #0a2035 !important; }
    [data-ogsc] .card-body     { background-color: #1e293b !important; }
    [data-ogsc] .card-footer   { background-color: #0a2035 !important; }
    [data-ogsc] .body-text     { color: #94a3b8 !important; }
    [data-ogsc] .title-text    { color: #e2e8f0 !important; }
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
                Redefinir sua senha
              </h1>
              <p class="body-text"
                style="margin:0 0 24px;font-size:15px;color:${GRAY};line-height:1.6;">
                Olá, ${primeiroNome}! Recebemos uma solicitação para redefinir a senha da sua
                conta no <strong class="title-text" style="color:${NAVY};">Busca Leilões Caixa</strong>.
                Clique no botão abaixo para criar uma nova senha.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${linkReset}"
                      style="display:inline-block;background-color:${NAVY};color:${WHITE};font-size:15px;font-weight:700;text-decoration:none;padding:13px 36px;border-radius:8px;border-bottom:3px solid ${AMBER};">
                      Redefinir senha &#8594;
                    </a>
                  </td>
                </tr>
              </table>

              <p class="body-text"
                style="margin:0 0 16px;font-size:13px;color:${GRAY};line-height:1.6;">
                Este link é válido por <strong>1 hora</strong>. Após esse prazo, será necessário
                solicitar um novo link.
              </p>

              <p class="body-text"
                style="margin:0;font-size:13px;color:${GRAY};line-height:1.6;">
                Se você não solicitou a redefinição de senha, ignore este e-mail — sua conta
                permanece segura.
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
    subject: "Redefinição de senha — Busca Leilões Caixa",
    html,
  };
}
