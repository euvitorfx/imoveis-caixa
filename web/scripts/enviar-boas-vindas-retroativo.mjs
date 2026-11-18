/**
 * Envia e-mail de boas-vindas retroativamente para todos os usuários
 * que ainda não receberam (não têm campo boasVindasEnviado: true).
 *
 * Uso: node web/scripts/enviar-boas-vindas-retroativo.mjs
 * Executar da raiz do projeto.
 */

import { MongoClient } from "mongodb";
import { Resend } from "resend";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Carrega .env.local ────────────────────────────────────────────────────────
function loadEnv(filePath) {
  try {
    const lines = readFileSync(filePath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // arquivo não encontrado — usa variáveis de ambiente existentes
  }
}

loadEnv(resolve("web/.env.local"));

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB  = process.env.MONGODB_DB;
const RESEND_KEY  = process.env.RESEND_API_KEY;

if (!MONGODB_URI || !MONGODB_DB || !RESEND_KEY) {
  console.error("Variáveis de ambiente ausentes: MONGODB_URI, MONGODB_DB ou RESEND_API_KEY");
  process.exit(1);
}

// ── Template de e-mail ────────────────────────────────────────────────────────
const NAVY  = "#01304D";
const AMBER = "#F59E0B";
const GRAY  = "#6b7280";
const WHITE = "#ffffff";

function emailBoasVindas(nome) {
  const primeiroNome = (nome ?? "").split(" ")[0] || "usuário";
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
    .feature-box{background-color:#f3f4f6;}
    .body-text{color:${GRAY};}
    .title-text{color:${NAVY};}
    .divider{border-color:#e5e7eb;}
    @media(prefers-color-scheme:dark){
      .email-wrapper{background-color:#0f172a!important;}
      .card-header{background-color:#0a2035!important;}
      .card-body{background-color:#1e293b!important;}
      .card-footer{background-color:#0a2035!important;}
      .feature-box{background-color:#0f172a!important;}
      .body-text{color:#94a3b8!important;}
      .title-text{color:#e2e8f0!important;}
      .divider{border-color:#334155!important;}
    }
    [data-ogsc] .email-wrapper{background-color:#0f172a!important;}
    [data-ogsc] .card-header{background-color:#0a2035!important;}
    [data-ogsc] .card-body{background-color:#1e293b!important;}
    [data-ogsc] .card-footer{background-color:#0a2035!important;}
    [data-ogsc] .feature-box{background-color:#0f172a!important;}
    [data-ogsc] .body-text{color:#94a3b8!important;}
    [data-ogsc] .title-text{color:#e2e8f0!important;}
    [data-ogsc] .divider{border-color:#334155!important;}
  </style>
</head>
<body class="email-wrapper" style="margin:0;padding:0;background-color:#f3f4f6;">
  <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f3f4f6" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td class="card-header" bgcolor="${NAVY}" style="background-color:${NAVY};border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
            <img src="https://www.buscaleiloescaixa.com.br/logo.png" alt="Busca Leilões Caixa" width="180" style="display:block;margin:0 auto;max-width:180px;height:auto;border:0;"/>
          </td>
        </tr>
        <tr><td bgcolor="${AMBER}" height="4" style="background-color:${AMBER};height:4px;line-height:4px;font-size:1px;"></td></tr>
        <tr>
          <td class="card-body" bgcolor="${WHITE}" style="background-color:${WHITE};padding:36px 32px;">
            <h1 class="title-text" style="margin:0 0 8px;font-size:24px;font-weight:700;color:${NAVY};line-height:1.3;">
              Seja bem-vindo, ${primeiroNome}!
            </h1>
            <p class="body-text" style="margin:0 0 24px;font-size:15px;color:${GRAY};line-height:1.6;">
              Sua conta no <strong class="title-text" style="color:${NAVY};">Busca Leilões Caixa</strong>
              foi criada com sucesso. Agora você tem acesso a ferramentas exclusivas
              para encontrar e analisar imóveis da Caixa Econômica Federal.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td class="feature-box" bgcolor="#f3f4f6" style="background-color:#f3f4f6;border-radius:10px;padding:16px 20px;border-left:4px solid ${AMBER};">
                  <div class="title-text" style="font-size:12px;font-weight:700;color:${NAVY};margin-bottom:12px;text-transform:uppercase;letter-spacing:.07em;">
                    O que está disponível para você
                  </div>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td class="divider" style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                      <span class="title-text" style="color:${NAVY};font-size:14px;font-weight:600;">&#9829; Favoritos</span>
                      <div class="body-text" style="font-size:12px;color:${GRAY};margin-top:2px;">Salve e acompanhe imóveis de interesse</div>
                    </td></tr>
                    <tr><td class="divider" style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                      <span class="title-text" style="color:${NAVY};font-size:14px;font-weight:600;">&#128202; Planilha de Viabilidade</span>
                      <div class="body-text" style="font-size:12px;color:${GRAY};margin-top:2px;">Calcule ROI, simule financiamento e exporte em XLS</div>
                    </td></tr>
                    <tr><td style="padding:8px 0;">
                      <span class="title-text" style="color:${NAVY};font-size:14px;font-weight:600;">&#128196; Exportar PDF</span>
                      <div class="body-text" style="font-size:12px;color:${GRAY};margin-top:2px;">Baixe a ficha completa com fotos de qualquer imóvel</div>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="https://www.buscaleiloescaixa.com.br" style="display:inline-block;background-color:${NAVY};color:${WHITE};font-size:15px;font-weight:700;text-decoration:none;padding:13px 36px;border-radius:8px;border-bottom:3px solid ${AMBER};">
                    Explorar imóveis &#8594;
                  </a>
                </td>
              </tr>
            </table>
            <p class="body-text" style="margin:0;font-size:13px;color:${GRAY};line-height:1.6;">
              Em breve você também terá acesso a <strong class="title-text" style="color:${NAVY};">alertas por e-mail</strong>
              quando novos imóveis da sua região aparecerem no acervo.
            </p>
          </td>
        </tr>
        <tr><td bgcolor="${AMBER}" height="4" style="background-color:${AMBER};height:4px;line-height:4px;font-size:1px;"></td></tr>
        <tr>
          <td class="card-footer" bgcolor="${NAVY}" style="background-color:${NAVY};border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.55);">
              Busca Leilões Caixa &middot; Dados obtidos diariamente do site oficial da Caixa Econômica Federal.
            </p>
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.55);">
              Dúvidas? <a href="mailto:atendimento@buscaleiloescaixa.com.br" style="color:${AMBER};text-decoration:none;font-weight:600;">atendimento@buscaleiloescaixa.com.br</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject: `Bem-vindo ao Busca Leilões Caixa, ${primeiroNome}!`,
    html,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
const DELAY_MS = 400; // pausa entre envios (Resend: 2 req/s no plano gratuito)

const client = new MongoClient(MONGODB_URI);
const resend  = new Resend(RESEND_KEY);

async function main() {
  await client.connect();
  const db  = client.db(MONGODB_DB);
  const col = db.collection("users");

  const users = await col
    .find({ boasVindasEnviado: { $ne: true } }, { projection: { _id: 1, name: 1, email: 1 } })
    .toArray();

  console.log(`\n${users.length} usuário(s) sem e-mail de boas-vindas.\n`);

  let ok = 0, falhou = 0;

  for (const user of users) {
    if (!user.email) { console.log(`  [skip] sem e-mail: ${user._id}`); continue; }

    const { subject, html } = emailBoasVindas(user.name);
    try {
      const res = await resend.emails.send({
        from:    "Busca Leilões Caixa <noreply@buscaleiloescaixa.com.br>",
        replyTo: "atendimento@buscaleiloescaixa.com.br",
        to:      user.email,
        subject,
        html,
      });

      if (res.error) {
        console.error(`  [erro]  ${user.email} — ${res.error.message}`);
        falhou++;
      } else {
        console.log(`  [ok]    ${user.email} (id: ${res.data?.id})`);
        await col.updateOne({ _id: user._id }, { $set: { boasVindasEnviado: true } });
        ok++;
      }
    } catch (err) {
      console.error(`  [exceção] ${user.email} — ${err.message}`);
      falhou++;
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\nConcluído: ${ok} enviado(s), ${falhou} falhou.\n`);
  await client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
