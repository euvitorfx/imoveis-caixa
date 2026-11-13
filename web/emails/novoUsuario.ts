const NAVY  = "#01304D";
const AMBER = "#F59E0B";
const GRAY  = "#6b7280";
const WHITE = "#ffffff";

export function emailNovoUsuario(nome: string, email: string, telefone?: string | null) {
  const fone = telefone?.replace(/\D/g, "") ?? "";
  const temFone = fone.length >= 10;

  const waLink = temFone
    ? `https://wa.me/55${fone}?text=${encodeURIComponent(`Olá, ${nome}! Vi que você acabou de criar sua conta no Busca Leilões Caixa. Posso te ajudar a encontrar algum imóvel?`)}`
    : null;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

      <!-- Header -->
      <tr>
        <td bgcolor="${NAVY}"
          style="background-color:${NAVY};border-radius:12px 12px 0 0;padding:20px 28px;">
          <p style="margin:0;font-size:11px;font-weight:700;color:${AMBER};text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">
            Busca Leilões Caixa
          </p>
          <h1 style="margin:0;font-size:18px;font-weight:700;color:#ffffff;line-height:1.3;">
            🔔 Novo cadastro
          </h1>
        </td>
      </tr>
      <tr><td bgcolor="${AMBER}" height="3" style="background-color:${AMBER};height:3px;line-height:3px;font-size:1px;"></td></tr>

      <!-- Body -->
      <tr>
        <td bgcolor="${WHITE}" style="background-color:${WHITE};padding:24px 28px;border-radius:0 0 12px 12px;">

          <!-- Dados do usuário -->
          <table width="100%" cellpadding="0" cellspacing="0"
            style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:20px;">
            <tr>
              <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;">
                <p style="margin:0;font-size:11px;color:${GRAY};text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Nome</p>
                <p style="margin:0;font-size:15px;font-weight:600;color:${NAVY};">${nome}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;">
                <p style="margin:0;font-size:11px;color:${GRAY};text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">E-mail</p>
                <a href="mailto:${email}" style="font-size:15px;font-weight:600;color:${NAVY};text-decoration:none;">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 16px;">
                <p style="margin:0;font-size:11px;color:${GRAY};text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">WhatsApp</p>
                ${temFone
                  ? `<p style="margin:0;font-size:15px;font-weight:600;color:${NAVY};">${telefone}</p>`
                  : `<p style="margin:0;font-size:14px;color:#9ca3af;font-style:italic;">Não informado (cadastro via Google)</p>`}
              </td>
            </tr>
          </table>

          <!-- Botão WhatsApp -->
          ${waLink ? `
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center">
                <a href="${waLink}"
                  style="display:inline-block;background-color:#25D366;color:#ffffff;
                  font-size:14px;font-weight:700;text-decoration:none;
                  padding:13px 32px;border-radius:9px;">
                  💬 Abrir conversa no WhatsApp →
                </a>
              </td>
            </tr>
          </table>` : ""}

        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  return {
    subject: `🔔 Novo cadastro: ${nome}`,
    html,
  };
}
