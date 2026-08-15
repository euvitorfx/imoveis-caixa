import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import clientPromise from "@/lib/mongodb";
import { getResend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { emailRecuperarSenha } from "@/emails/recuperarSenha";
import { emailContaGoogle } from "@/emails/contaGoogle";
import { SITE_URL } from "@/lib/config";
const TTL_MS = 60 * 60 * 1000; // 1 hora

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const user = await db.collection("users").findOne(
    { email: normalizedEmail },
    { projection: { name: 1, senhaHash: 1 } },
  );

  if (!user) {
    return NextResponse.json({ ok: true });
  }

  // Conta Google: não tem senhaHash — avisa para usar "Continuar com Google"
  if (!user.senhaHash) {
    const resend = getResend();
    if (resend) {
      try {
        const { subject, html } = emailContaGoogle(user.name ?? "usuário");
        await resend.emails.send({
          from: EMAIL_FROM,
          replyTo: EMAIL_REPLY_TO,
          to: normalizedEmail,
          subject,
          html,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[resend] ERRO conta-google:", msg);
      }
    }
    return NextResponse.json({ ok: true });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_MS);

  await db.collection("passwordResets").updateOne(
    { email: normalizedEmail },
    { $set: { token, expiresAt } },
    { upsert: true },
  );

  const link = `${SITE_URL}/redefinir-senha?token=${token}`;
  const resend = getResend();
  if (resend) {
    try {
      const { subject, html } = emailRecuperarSenha(user.name ?? "usuário", link);
      await resend.emails.send({
        from: EMAIL_FROM,
        replyTo: EMAIL_REPLY_TO,
        to: normalizedEmail,
        subject,
        html,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[resend] ERRO recuperar-senha:", msg);
    }
  }

  return NextResponse.json({ ok: true });
}
