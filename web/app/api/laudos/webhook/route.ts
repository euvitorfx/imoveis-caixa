import { NextRequest, NextResponse } from "next/server";
import { getLaudoById, updateLaudo } from "@/lib/laudos";
import { getResend, EMAIL_FROM } from "@/lib/resend";
import { SITE_URL } from "@/lib/config";
// POST /api/laudos/webhook — Mercado Pago envia eventos aqui
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // TODO: reabilitar validação de assinatura após confirmar fluxo
  // const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // MP envia type="payment" para pagamentos
  if (event.type !== "payment") return NextResponse.json({ ok: true });

  const paymentId = String((event.data as Record<string, unknown>)?.id ?? "");
  if (!paymentId) return NextResponse.json({ ok: true });

  // Buscar detalhes do pagamento na API do MP
  const mpRes = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    }
  );
  if (!mpRes.ok) return NextResponse.json({ ok: true });

  const payment = await mpRes.json();
  if (payment.status !== "approved") return NextResponse.json({ ok: true });

  // external_reference = laudoId
  const laudoId = payment.external_reference as string;
  if (!laudoId) return NextResponse.json({ ok: true });

  const laudo = await getLaudoById(laudoId);
  if (!laudo || !laudo._id) return NextResponse.json({ ok: true });
  if (laudo.status !== "aguardando_pagamento") return NextResponse.json({ ok: true });

  await updateLaudo(laudo._id, {
    status: "pago",
    paidAt: new Date().toISOString(),
  });

  // E-mail de confirmação ao comprador
  const resend = getResend();
  if (resend && laudo.userEmail) {
    const nivelLabel =
      laudo.nivel === 1 ? "Laudo Digital" : "Laudo + Consulta com Especialista";
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
              Dúvidas? <a href="mailto:atendimento@buscaleiloescaixa.com.br">atendimento@buscaleiloescaixa.com.br</a>
            </p>
          </div>
        </div>
      `,
    });

    // Notificação interna ao atendimento
    const adminUrl = `${SITE_URL}/admin`;
    await resend.emails.send({
      from: EMAIL_FROM,
      to: "atendimento@buscaleiloescaixa.com.br",
      subject: `💰 Nova venda — ${nivelLabel} · ${valorFmt}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#0C1A25">
          <div style="background:#01304D;padding:24px 28px;border-radius:12px 12px 0 0">
            <h1 style="color:#F59E0B;font-size:20px;margin:0">Nova venda · BLC</h1>
          </div>
          <div style="background:#F4F9FC;padding:28px;border-radius:0 0 12px 12px;border:1px solid #CBD9E3">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr>
                <td style="padding:8px 0;color:#4A6070;width:120px">Cliente</td>
                <td style="padding:8px 0;font-weight:600">${laudo.userName}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#4A6070">E-mail</td>
                <td style="padding:8px 0"><a href="mailto:${laudo.userEmail}" style="color:#01304D">${laudo.userEmail}</a></td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#4A6070">Plano</td>
                <td style="padding:8px 0;font-weight:600">${nivelLabel}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#4A6070">Valor</td>
                <td style="padding:8px 0;font-weight:700;color:#01304D">${valorFmt}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#4A6070">Imóvel</td>
                <td style="padding:8px 0">${laudo.imovelDescricao}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#4A6070">Laudo #</td>
                <td style="padding:8px 0">${laudo.numero ? `#${String(laudo.numero).padStart(4, "0")}` : laudo._id}</td>
              </tr>
            </table>
            <div style="margin-top:24px;text-align:center">
              <a href="${adminUrl}" style="background:#01304D;color:#F59E0B;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
                Abrir painel admin →
              </a>
            </div>
          </div>
        </div>
      `,
    });
  }

  return NextResponse.json({ ok: true });
}
