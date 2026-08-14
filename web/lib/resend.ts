import { Resend } from "resend";

export const EMAIL_FROM = "Busca Leilões Caixa <noreply@buscaleiloescaixa.com.br>";
export const EMAIL_REPLY_TO = "atendimento@buscaleiloescaixa.com.br";

let _client: Resend | null = null;

export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[resend] RESEND_API_KEY não definida — e-mails não serão enviados.");
    return null;
  }
  if (!_client) _client = new Resend(process.env.RESEND_API_KEY);
  return _client;
}
