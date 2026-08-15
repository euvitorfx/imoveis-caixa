import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";
import { getResend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { emailBoasVindas } from "@/emails/boasVindas";

export async function POST(req: NextRequest) {
  const { nome, email, telefone, senha } = await req.json();

  if (!nome || !email || !senha || !telefone) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ error: "A senha deve ter ao menos 6 caracteres" }, { status: 400 });
  }

  const client = await clientPromise;
  const col = client.db(process.env.MONGODB_DB).collection("users");

  const existe = await col.findOne({ email: email.toLowerCase() });
  if (existe) {
    return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  await col.insertOne({
    name: nome,
    email: email.toLowerCase(),
    emailVerified: null,
    senhaHash,
    telefone: telefone ?? null,
    plano: "gratuito",
    favoritos: [],
    criadoEm: new Date(),
  });

  // Envia e-mail de boas-vindas aguardando a conclusão (await garante que
  // a função não é encerrada pelo Vercel antes do envio completar)
  const resend = getResend();
  if (!resend) {
    console.warn("[resend] boas-vindas NAO enviado — RESEND_API_KEY ausente");
  } else {
    try {
      const { subject, html } = emailBoasVindas(nome);
      const res = await resend.emails.send({
        from: EMAIL_FROM,
        replyTo: EMAIL_REPLY_TO,
        to: email.toLowerCase(),
        subject,
        html,
      });
      console.log("[resend] boas-vindas enviado:", res.data?.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[resend] ERRO ao enviar boas-vindas:", msg);
    }
  }

  return NextResponse.json({ ok: true });
}
