import { NextResponse } from "next/server";
import { getResend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { emailBoasVindas } from "@/emails/boasVindas";

// Rota temporária de diagnóstico — remover após confirmar funcionamento
export async function GET() {
  const steps: Record<string, unknown> = {};

  // 1. Verificar variável de ambiente
  const key = process.env.RESEND_API_KEY;
  steps["1_api_key"] = key ? `presente (${key.slice(0, 8)}...)` : "AUSENTE";

  // 2. Instanciar cliente
  const resend = getResend();
  steps["2_cliente"] = resend ? "ok" : "null — getResend() retornou null";

  if (!resend) {
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }

  // 3. Gerar template de e-mail
  let subject = "", html = "";
  try {
    ({ subject, html } = emailBoasVindas("Teste"));
    steps["3_template"] = `ok — subject: "${subject}", html: ${html.length} chars`;
  } catch (err) {
    steps["3_template"] = `ERRO: ${err instanceof Error ? err.message : String(err)}`;
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }

  // 4. Enviar e-mail
  try {
    const res = await resend.emails.send({
      from: EMAIL_FROM,
      replyTo: EMAIL_REPLY_TO,
      to: "vitorvalenca1@gmail.com",
      subject: `[DIAGNÓSTICO] ${subject}`,
      html,
    });
    steps["4_envio"] = { id: res.data?.id, error: res.error };
    return NextResponse.json({ ok: !res.error, steps });
  } catch (err) {
    steps["4_envio"] = `EXCEÇÃO: ${err instanceof Error ? err.message : String(err)}`;
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }
}
