import { NextResponse } from "next/server";
import { getResend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";

// Rota temporária de diagnóstico — remover após confirmar funcionamento
export async function GET() {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    return NextResponse.json({ ok: false, erro: "RESEND_API_KEY não definida no ambiente" }, { status: 500 });
  }

  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ ok: false, erro: "getResend() retornou null mesmo com chave presente" }, { status: 500 });
  }

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      replyTo: EMAIL_REPLY_TO,
      to: "vitorvalenca1@gmail.com",
      subject: "Teste Resend — Busca Leilões Caixa",
      html: "<p>Se você recebeu este e-mail, o Resend está funcionando corretamente. ✅</p>",
    });

    return NextResponse.json({ ok: true, id: result.data?.id, result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
