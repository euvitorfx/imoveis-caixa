import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.warn("[resend] RESEND_API_KEY não definida — e-mails não serão enviados.");
}

export const resend = new Resend(process.env.RESEND_API_KEY ?? "");

export const EMAIL_FROM = "Busca Leilões Caixa <noreply@buscaleiloescaixa.com.br>";
export const EMAIL_REPLY_TO = "atendimento@buscaleiloescaixa.com.br";
