import { NextRequest, NextResponse } from "next/server";
import { getLaudoByPagarmeOrderId, updateLaudo } from "@/lib/laudos";
import { getResend, EMAIL_FROM } from "@/lib/resend";
import { SITE_URL } from "@/lib/config";
import crypto from "crypto";

// POST /api/laudos/webhook — Pagar.me envia eventos aqui
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Validar assinatura do Pagar.me (se chave configurada)
  const secret = process.env.PAGARME_WEBHOOK_SECRET;
  if (secret) {
    const signature = req.headers.get("x-hub-signature") ?? "";
    const hash = "sha1=" + crypto.createHmac("sha1", secret).update(rawBody).digest("hex");
    if (hash !== signature) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const type = event.type as string;

  // Eventos de pagamento confirmado
  if (type === "order.paid" || type === "charge.paid") {
    const orderId =
      type === "order.paid"
        ? (event.data as Record<string, unknown>)?.id as string
        : (event.data as Record<string, unknown>)?.order_id as string;

    if (!orderId) return NextResponse.json({ ok: true });

    const laudo = await getLaudoByPagarmeOrderId(orderId);
    if (!laudo || !laudo._id) return NextResponse.json({ ok: true });

    // Já confirmado antes?
    if (laudo.status !== "aguardando_pagamento") return NextResponse.json({ ok: true });

    await updateLaudo(laudo._id, {
      status: "pago",
      paidAt: new Date().toISOString(),
    });

    // Enviar e-mail de confirmação ao comprador
    const resend = getResend();
    if (resend && laudo.userEmail) {
      const nivelLabel = laudo.nivel === 1 ? "Laudo Digital" : "Laudo + Consulta com Especialista";
      const valorFmt = (laudo.preco / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      const laudoUrl = `${SITE_URL}/laudos/${laudo._id}`;

      await resend.emails.send({
        from: EMAIL_FROM,
        to: laudo.userEmail,
        subject: `✅ Pagamento confirmado — ${nivelLabel} BLC`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#0C1A25">
            <div style="background:#01304D;padding:24px 28px;border-radius:12px 12px 0 0">
              <h1 style="color:#F59E0B;font-size:20px;margin:0">Busca Leilões Caixa</h1>
            </div>
            <div style="background:#F4F9FC;padding:28px;border-radius:0 0 12px 12px;border:1px solid #CBD9E3">
              <h2 style="font-size:18px;margin-top:0">Pagamento confirmado! 🎉</h2>
              <p>Olá, <strong>${laudo.userName}</strong>!</p>
              <p>Recebemos o pagamento do seu <strong>${nivelLabel}</strong> para o imóvel:</p>
              <div style="background:white;border:1px solid #CBD9E3;border-radius:8px;padding:14px 16px;margin:16px 0">
                <strong>${laudo.imovelDescricao}</strong>
              </div>
              <p><strong>Valor pago:</strong> ${valorFmt}</p>
              <p>Seu laudo já está na fila de produção. Você receberá um e-mail quando ele estiver pronto.</p>
              ${laudo.nivel === 2 ? `<p>Para agendar sua consulta com o especialista, entre em contato via WhatsApp: <a href="https://wa.me/5582987801819">+55 82 98780-1819</a></p>` : ""}
              <div style="margin-top:24px;text-align:center">
                <a href="${laudoUrl}" style="background:#F59E0B;color:#01304D;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
                  Acompanhar meu laudo →
                </a>
              </div>
              <p style="font-size:12px;color:#4A6070;margin-top:24px">
                Dúvidas? Fale conosco em <a href="mailto:atendimento@buscaleiloescaixa.com.br">atendimento@buscaleiloescaixa.com.br</a>
              </p>
            </div>
          </div>
        `,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
