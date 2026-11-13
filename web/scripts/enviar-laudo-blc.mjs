/**
 * Disparo do e-mail de lançamento do Laudo BLC.
 *
 * Uso:
 *   node web/scripts/enviar-laudo-blc.mjs            # envia de verdade
 *   node web/scripts/enviar-laudo-blc.mjs --dry-run  # lista destinatários sem enviar
 *   node web/scripts/enviar-laudo-blc.mjs --test seu@email.com  # envia só para 1 endereço
 *
 * Executar da raiz do projeto.
 * Marca cada usuário com { laudoBLCEmailEnviado: true } para evitar reenvio acidental.
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
    // usa variáveis de ambiente existentes
  }
}

loadEnv(resolve("web/.env.local"));

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB  = process.env.MONGODB_DB;
const RESEND_KEY  = process.env.RESEND_API_KEY;

if (!MONGODB_URI || !MONGODB_DB || !RESEND_KEY) {
  console.error("❌ Variáveis ausentes: MONGODB_URI, MONGODB_DB ou RESEND_API_KEY");
  process.exit(1);
}

// ── Flags de execução ─────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const DRY_RUN  = args.includes("--dry-run");
const testIdx  = args.indexOf("--test");
const TEST_TO  = testIdx !== -1 ? args[testIdx + 1] : null;

if (DRY_RUN)  console.log("🔍 Modo dry-run: nenhum e-mail será enviado.\n");
if (TEST_TO)  console.log(`🧪 Modo teste: enviando apenas para ${TEST_TO}\n`);

// ── Constantes de design ──────────────────────────────────────────────────────
const NAVY  = "#01304D";
const AMBER = "#F59E0B";
const GRAY  = "#6b7280";
const WHITE = "#ffffff";
const LIGHT_BG = "#F4F9FC";
const BORDER   = "#CBD9E3";

// ── Template de e-mail ────────────────────────────────────────────────────────
function gerarEmail(nome) {
  const primeiroNome = (nome ?? "").split(" ")[0].trim() || "usuário";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta name="color-scheme" content="light dark"/>
  <style>
    body,table,td{margin:0;padding:0;border-collapse:collapse;}
    .ew{background-color:#E8ECF0;}
    .eh{background-color:${NAVY};}
    .eb{background-color:${WHITE};}
    .ef{background-color:${LIGHT_BG};}
    .bt{color:${NAVY};}
    .bm{color:${GRAY};}
    .bs{color:#7A97A8;}
    .bloco{background-color:${LIGHT_BG};border:1px solid ${BORDER};border-radius:8px;padding:12px 14px;}
    .plano{border:1px solid ${BORDER};border-radius:10px;padding:14px;}
    .plano-dest{background-color:#FEF3C7;border-color:${AMBER};}
    @media(prefers-color-scheme:dark){
      .ew{background-color:#0D1B25!important;}
      .eh{background-color:#0a2035!important;}
      .eb{background-color:#152434!important;}
      .ef{background-color:#1A2E3D!important;}
      .bt{color:#E8F0F5!important;}
      .bm{color:#8CAABB!important;}
      .bs{color:#567080!important;}
      .bloco{background-color:#1A2E3D!important;border-color:#2A4055!important;}
      .plano{border-color:#2A4055!important;}
      .plano-dest{background-color:#2D2008!important;border-color:${AMBER}!important;}
    }
    [data-ogsc] .ew{background-color:#0D1B25!important;}
    [data-ogsc] .eh{background-color:#0a2035!important;}
    [data-ogsc] .eb{background-color:#152434!important;}
    [data-ogsc] .ef{background-color:#1A2E3D!important;}
    [data-ogsc] .bt{color:#E8F0F5!important;}
    [data-ogsc] .bm{color:#8CAABB!important;}
  </style>
</head>
<body class="ew" style="margin:0;padding:0;background-color:#E8ECF0;">
<table class="ew" width="100%" cellpadding="0" cellspacing="0"
  style="background-color:#E8ECF0;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

      <!-- HEADER -->
      <tr>
        <td class="eh" bgcolor="${NAVY}"
          style="background-color:${NAVY};border-radius:12px 12px 0 0;padding:28px 32px 24px;">
          <div style="font-size:12px;font-weight:700;color:${AMBER};text-transform:uppercase;
            letter-spacing:.05em;margin-bottom:16px;">Busca Leilões Caixa</div>
          <h1 style="margin:0 0 10px;font-size:21px;font-weight:700;color:#ffffff;line-height:1.3;">
            Antes de arrematar, você precisa saber com o que está lidando.
          </h1>
          <p style="margin:0;font-size:14px;color:rgba(255,255,255,.65);line-height:1.5;">
            Lançamos o Laudo BLC: análise profissional de imóveis em leilão, entregue antes do arremate.
          </p>
        </td>
      </tr>

      <!-- FAIXA ÂMBAR -->
      <tr><td bgcolor="${AMBER}" height="4"
        style="background-color:${AMBER};height:4px;line-height:4px;font-size:1px;"></td></tr>

      <!-- BODY -->
      <tr>
        <td class="eb" bgcolor="${WHITE}"
          style="background-color:${WHITE};padding:28px 32px;">

          <!-- Intro -->
          <p class="bm" style="margin:0 0 20px;font-size:15px;color:${GRAY};line-height:1.65;">
            Olá, <strong class="bt" style="color:${NAVY};">${primeiroNome}</strong>!
          </p>
          <p class="bm" style="margin:0 0 20px;font-size:15px;color:${GRAY};line-height:1.65;">
            Você usa o BLC para encontrar imóveis em leilão. Mas encontrar um imóvel é só o começo
            — a decisão de dar um lance é onde a maioria das pessoas erra.
          </p>
          <p class="bm" style="margin:0 0 24px;font-size:15px;color:${GRAY};line-height:1.65;">
            Pensando nisso, lançamos o
            <strong class="bt" style="color:${NAVY};">Laudo BLC</strong>:
            uma análise completa feita por especialistas para te ajudar a arrematar com segurança.
          </p>

          <!-- 4 blocos 2×2 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td width="49%" class="bloco"
                style="background-color:${LIGHT_BG};border:1px solid ${BORDER};border-radius:8px;padding:12px 14px;vertical-align:top;">
                <div class="bt" style="font-size:13px;font-weight:600;color:${NAVY};margin-bottom:3px;">
                  📊 Análise de Mercado
                </div>
                <div class="bm" style="font-size:12px;color:${GRAY};line-height:1.4;">
                  Valor real vs. lance mínimo. Você sabe se está fazendo um bom negócio.
                </div>
              </td>
              <td width="2%"></td>
              <td width="49%" class="bloco"
                style="background-color:${LIGHT_BG};border:1px solid ${BORDER};border-radius:8px;padding:12px 14px;vertical-align:top;">
                <div class="bt" style="font-size:13px;font-weight:600;color:${NAVY};margin-bottom:3px;">
                  📋 Análise da Matrícula
                </div>
                <div class="bm" style="font-size:12px;color:${GRAY};line-height:1.4;">
                  Ônus, hipotecas e histórico de proprietários. Sem surpresas no cartório.
                </div>
              </td>
            </tr>
            <tr><td colspan="3" height="10" style="line-height:10px;font-size:1px;"></td></tr>
            <tr>
              <td width="49%" class="bloco"
                style="background-color:${LIGHT_BG};border:1px solid ${BORDER};border-radius:8px;padding:12px 14px;vertical-align:top;">
                <div class="bt" style="font-size:13px;font-weight:600;color:${NAVY};margin-bottom:3px;">
                  ⚖️ Análise Jurídica
                </div>
                <div class="bm" style="font-size:12px;color:${GRAY};line-height:1.4;">
                  Riscos legais, dívidas e situação do ocupante. Antes de assinar qualquer coisa.
                </div>
              </td>
              <td width="2%"></td>
              <td width="49%" class="bloco"
                style="background-color:${LIGHT_BG};border:1px solid ${BORDER};border-radius:8px;padding:12px 14px;vertical-align:top;">
                <div class="bt" style="font-size:13px;font-weight:600;color:${NAVY};margin-bottom:3px;">
                  💰 Viabilidade Financeira
                </div>
                <div class="bm" style="font-size:12px;color:${GRAY};line-height:1.4;">
                  ROI estimado, custos reais e lance máximo recomendado.
                </div>
              </td>
            </tr>
          </table>

          <!-- Planos -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td width="44%" class="plano"
                style="border:1px solid ${BORDER};border-radius:10px;padding:14px;vertical-align:top;">
                <div class="bt" style="font-size:13px;font-weight:700;color:${NAVY};margin-bottom:3px;">
                  Laudo Digital
                </div>
                <div class="bm" style="font-size:11px;color:${GRAY};margin-bottom:10px;line-height:1.4;">
                  PDF completo em até 2 dias úteis
                </div>
                <div class="bt" style="font-size:22px;font-weight:800;color:${NAVY};">R$ 97</div>
              </td>
              <td width="4%"></td>
              <td width="52%" class="plano plano-dest"
                style="background-color:#FEF3C7;border:1px solid ${AMBER};border-radius:10px;padding:14px;vertical-align:top;">
                <div style="display:inline-block;background:${AMBER};color:#78350F;font-size:10px;
                  font-weight:700;padding:2px 8px;border-radius:999px;margin-bottom:6px;
                  text-transform:uppercase;letter-spacing:.04em;">Mais completo</div>
                <div style="font-size:13px;font-weight:700;color:#92400E;margin-bottom:4px;">
                  Digital + Consulta ao vivo
                </div>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                  <tr><td style="font-size:11px;color:#92400E;padding:2px 0 2px 14px;line-height:1.35;position:relative;">
                    ✓ 30 min com especialista via WhatsApp
                  </td></tr>
                  <tr><td style="font-size:11px;color:#92400E;padding:2px 0 2px 14px;line-height:1.35;">
                    ✓ Dúvidas sobre este imóvel
                  </td></tr>
                  <tr><td style="font-size:11px;color:#92400E;padding:2px 0 2px 14px;line-height:1.35;">
                    ✓ Estratégia de lance
                  </td></tr>
                  <tr><td style="font-size:11px;color:#92400E;padding:2px 0 2px 14px;line-height:1.35;">
                    ✓ Orientação pós-arrematação
                  </td></tr>
                </table>
                <div style="font-size:22px;font-weight:800;color:#92400E;">R$ 297</div>
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td align="center">
                <a href="https://www.buscaleiloescaixa.com.br"
                  style="display:inline-block;background-color:${NAVY};color:${WHITE};
                  font-size:15px;font-weight:700;text-decoration:none;padding:15px 40px;
                  border-radius:10px;border-bottom:3px solid ${AMBER};">
                  Solicitar meu laudo →
                </a>
              </td>
            </tr>
          </table>

          <!-- Como solicitar -->
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background-color:${LIGHT_BG};border:1px solid ${BORDER};border-radius:12px;
            padding:16px 20px;margin-bottom:24px;">
            <tr>
              <td style="padding:16px 20px;">
                <div class="bs" style="font-size:11px;font-weight:700;text-transform:uppercase;
                  letter-spacing:.06em;color:#7A97A8;margin-bottom:12px;">
                  Como solicitar
                </div>
                <!-- Passo 1 -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                  <tr>
                    <td width="28" valign="top">
                      <div style="width:24px;height:24px;border-radius:50%;background:${NAVY};
                        color:#fff;font-size:12px;font-weight:700;text-align:center;
                        line-height:24px;">1</div>
                    </td>
                    <td style="padding-left:10px;">
                      <p class="bm" style="font-size:13px;color:${GRAY};line-height:1.4;margin:0;padding-top:3px;">
                        Abra a página de qualquer imóvel no BLC
                      </p>
                    </td>
                  </tr>
                </table>
                <!-- Passo 2 -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                  <tr>
                    <td width="28" valign="top">
                      <div style="width:24px;height:24px;border-radius:50%;background:${NAVY};
                        color:#fff;font-size:12px;font-weight:700;text-align:center;
                        line-height:24px;">2</div>
                    </td>
                    <td style="padding-left:10px;">
                      <p class="bm" style="font-size:13px;color:${GRAY};line-height:1.4;margin:0;padding-top:3px;">
                        Clique no botão
                        <strong class="bt" style="color:${NAVY};">"Solicitar Laudo BLC"</strong>
                        que aparece na página do imóvel
                      </p>
                    </td>
                  </tr>
                </table>
                <!-- Passo 3 -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="28" valign="top">
                      <div style="width:24px;height:24px;border-radius:50%;background:${AMBER};
                        color:#78350F;font-size:12px;font-weight:700;text-align:center;
                        line-height:24px;">3</div>
                    </td>
                    <td style="padding-left:10px;">
                      <p class="bm" style="font-size:13px;color:${GRAY};line-height:1.4;margin:0;padding-top:3px;">
                        Escolha o plano e finalize o pagamento — entregamos em até 2 dias úteis
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Assinatura -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="border-top:1px solid ${BORDER};padding-top:20px;">
                <p class="bm" style="margin:0;font-size:14px;color:${GRAY};line-height:1.6;">
                  Abraço,<br>
                  <strong class="bt" style="color:${NAVY};">Vitor</strong><br>
                  Busca Leilões Caixa
                </p>
              </td>
            </tr>
          </table>

        </td>
      </tr>

      <!-- FAIXA ÂMBAR INFERIOR -->
      <tr><td bgcolor="${AMBER}" height="4"
        style="background-color:${AMBER};height:4px;line-height:4px;font-size:1px;"></td></tr>

      <!-- FOOTER -->
      <tr>
        <td class="ef" bgcolor="${LIGHT_BG}"
          style="background-color:${LIGHT_BG};border-radius:0 0 12px 12px;
          padding:18px 32px;text-align:center;border-top:1px solid ${BORDER};">
          <p class="bs" style="margin:0 0 6px;font-size:11px;color:#7A97A8;line-height:1.6;">
            Busca Leilões Caixa · buscaleiloescaixa.com.br<br>
            Você está recebendo este e-mail porque tem uma conta no BLC.
          </p>
          <p class="bs" style="margin:0;font-size:11px;color:#7A97A8;">
            Dúvidas?
            <a href="mailto:atendimento@buscaleiloescaixa.com.br"
              style="color:${AMBER};text-decoration:none;font-weight:600;">
              atendimento@buscaleiloescaixa.com.br
            </a>
          </p>
        </td>
      </tr>

      <!-- PIXEL DE RASTREAMENTO -->
      <tr>
        <td height="1" style="line-height:1px;font-size:1px;">
          <img src="https://www.buscaleiloescaixa.com.br/api/email/pixel/laudo-blc-01"
            width="1" height="1" border="0" style="display:block;" alt=""/>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { subject: "Agora fazemos a análise completa do imóvel por você 📋", html };
}

// ── Main ──────────────────────────────────────────────────────────────────────
const DELAY_MS = 500; // 2 req/s — dentro do limite do Resend

const client = new MongoClient(MONGODB_URI);
const resend  = new Resend(RESEND_KEY);

async function main() {
  await client.connect();
  const db  = client.db(MONGODB_DB);
  const col = db.collection("users");

  let users;

  if (TEST_TO) {
    // Modo teste: envia para 1 endereço fixo, sem marcar o banco
    users = [{ _id: null, name: "Teste", email: TEST_TO }];
  } else {
    users = await col
      .find(
        { laudoBLCEmailEnviado: { $ne: true } },
        { projection: { _id: 1, name: 1, email: 1 } }
      )
      .toArray();
  }

  console.log(`\n📬 ${users.length} destinatário(s) encontrado(s).\n`);

  if (DRY_RUN) {
    for (const u of users) {
      console.log(`  • ${u.email ?? "(sem e-mail)"} — ${u.name ?? "(sem nome)"}`);
    }
    console.log("\nDry-run concluído. Nenhum e-mail enviado.\n");
    await client.close();
    return;
  }

  let ok = 0, falhou = 0;

  for (const user of users) {
    if (!user.email) {
      console.log(`  [skip]  sem e-mail: ${user._id}`);
      continue;
    }

    const { subject, html } = gerarEmail(user.name);

    try {
      const res = await resend.emails.send({
        from:    "Vitor · BLC <noreply@buscaleiloescaixa.com.br>",
        replyTo: "atendimento@buscaleiloescaixa.com.br",
        to:      user.email,
        subject,
        html,
      });

      if (res.error) {
        console.error(`  [erro]  ${user.email} — ${res.error.message}`);
        falhou++;
      } else {
        console.log(`  [ok]    ${user.email} (resend id: ${res.data?.id})`);
        if (user._id) {
          await col.updateOne(
            { _id: user._id },
            { $set: { laudoBLCEmailEnviado: true, laudoBLCEmailEnviadoEm: new Date().toISOString() } }
          );
        }
        ok++;
      }
    } catch (err) {
      console.error(`  [exceção] ${user.email} — ${err.message}`);
      falhou++;
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n✅ Concluído: ${ok} enviado(s), ${falhou} falhou.\n`);
  await client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
