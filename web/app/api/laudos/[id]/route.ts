import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLaudoById, updateLaudo, deleteLaudo } from "@/lib/laudos";
import { getResend, EMAIL_FROM } from "@/lib/resend";
import { SITE_URL } from "@/lib/config";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/laudos/[id] — detalhe do laudo (usuário ou admin)
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const isAdmin = _req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
  if (laudo.userId !== session.user.id && !isAdmin)
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  return NextResponse.json(laudo);
}

// DELETE /api/laudos/[id] — exclui laudo não pago (próprio usuário)
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (laudo.userId !== session.user.id) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  if (laudo.status !== "aguardando_pagamento")
    return NextResponse.json({ error: "Só é possível excluir laudos não pagos" }, { status: 400 });

  await deleteLaudo(id);
  return NextResponse.json({ ok: true });
}

// PATCH /api/laudos/[id] — atualiza laudo (somente admin)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || token !== process.env.ADMIN_SECRET)
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const laudo = await getLaudoById(id);
  if (!laudo) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json();
  const statusAnterior = laudo.status;
  await updateLaudo(id, body);

  // Dispara e-mail de entrega quando admin marca como "entregue"
  if (body.status === "entregue" && statusAnterior !== "entregue") {
    const resend = getResend();
    if (resend && laudo.userEmail) {
      const nivelLabel = laudo.nivel === 1 ? "Laudo Digital" : "Laudo + Consulta com Especialista";
      const laudoUrl = `${SITE_URL}/laudos/${id}`;
      await resend.emails.send({
        from: EMAIL_FROM,
        to: laudo.userEmail,
        subject: `🎉 Seu ${nivelLabel} BLC foi entregue!`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#0C1A25">
            <div style="background:#01304D;padding:24px 28px;border-radius:12px 12px 0 0">
              <h1 style="color:#F59E0B;font-size:20px;margin:0">Busca Leilões Caixa</h1>
            </div>
            <div style="background:#F4F9FC;padding:28px;border-radius:0 0 12px 12px;border:1px solid #CBD9E3">
              <h2 style="font-size:18px;margin-top:0">Seu laudo foi entregue! 🎉</h2>
              <p>Olá, <strong>${laudo.userName}</strong>!</p>
              <p>Seu <strong>${nivelLabel}</strong> para o imóvel abaixo está pronto:</p>
              <div style="background:white;border:1px solid #CBD9E3;border-radius:8px;padding:14px 16px;margin:16px 0">
                <strong>${laudo.imovelDescricao}</strong>
              </div>
              <p>Acesse o link abaixo para visualizar a análise completa e baixar o PDF.</p>
              <div style="margin-top:24px;text-align:center">
                <a href="${laudoUrl}" style="background:#F59E0B;color:#01304D;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block">
                  📄 Ver meu laudo →
                </a>
              </div>
              ${laudo.nivel === 2 ? `<p style="margin-top:20px">Lembre-se de agendar sua consulta via WhatsApp: <a href="https://wa.me/5582987801819">+55 82 98780-1819</a></p>` : ""}
              <p style="font-size:12px;color:#4A6070;margin-top:24px">
                Dúvidas? <a href="mailto:atendimento@buscaleiloescaixa.com.br">atendimento@buscaleiloescaixa.com.br</a>
              </p>
            </div>
          </div>
        `,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
