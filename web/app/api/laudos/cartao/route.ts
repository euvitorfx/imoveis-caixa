import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLaudoById } from "@/lib/laudos";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.buscaleiloescaixa.com.br";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { laudoId } = await req.json();
  if (!laudoId) return NextResponse.json({ error: "laudoId obrigatório" }, { status: 400 });

  const laudo = await getLaudoById(laudoId);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });
  if (laudo.userId !== session.user.id) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  if (laudo.status !== "aguardando_pagamento") return NextResponse.json({ error: "Laudo já pago" }, { status: 400 });

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "MERCADOPAGO_ACCESS_TOKEN não definida" }, { status: 500 });

  const preferenceBody = {
    items: [
      {
        title: laudo.nivel === 1 ? "Laudo Digital BLC" : "Laudo BLC + Consulta",
        description: laudo.imovelDescricao,
        quantity: 1,
        unit_price: laudo.preco / 100,
        currency_id: "BRL",
      },
    ],
    external_reference: laudoId,
    payer: { email: laudo.userEmail },
    back_urls: {
      success: `${SITE_URL}/laudos/checkout/${laudoId}?pago=1`,
      failure: `${SITE_URL}/laudos/checkout/${laudoId}?erro=pagamento`,
      pending: `${SITE_URL}/laudos/checkout/${laudoId}?pendente=1`,
    },
    auto_return: "approved",
    notification_url: `${SITE_URL}/api/laudos/webhook`,
    statement_descriptor: "LAUDOBLC",
  };

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `cartao-${laudoId}`,
    },
    body: JSON.stringify(preferenceBody),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: "Erro ao criar preferência de pagamento" }, { status: 500 });
  }

  return NextResponse.json({ initPoint: data.init_point });
}
