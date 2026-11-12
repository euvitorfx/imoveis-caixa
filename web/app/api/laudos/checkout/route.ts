import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLaudoById, updateLaudo, PRECOS } from "@/lib/laudos";

function pagarmeAuth() {
  const key = process.env.PAGARME_API_KEY;
  if (!key) throw new Error("PAGARME_API_KEY não definida");
  return `Basic ${Buffer.from(key + ":").toString("base64")}`;
}

// POST /api/laudos/checkout
// Body: { laudoId }
// Cria uma ordem PIX no Pagar.me e retorna os dados do QR code
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { laudoId } = await req.json();
  if (!laudoId) return NextResponse.json({ error: "laudoId obrigatório" }, { status: 400 });

  const laudo = await getLaudoById(laudoId);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });
  if (laudo.userId !== session.user.id) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  // Se já tem um orderId do Pagar.me, busca o status atual
  if (laudo.pagarmeOrderId) {
    try {
      const existing = await fetch(
        `https://api.pagar.me/core/v5/orders/${laudo.pagarmeOrderId}`,
        { headers: { Authorization: pagarmeAuth() } }
      );
      const data = await existing.json();
      const charge = data.charges?.[0];
      const tx = charge?.last_transaction;
      if (tx?.qr_code) {
        return NextResponse.json({
          orderId: data.id,
          chargeId: charge.id,
          qrCode: tx.qr_code,
          qrCodeUrl: tx.qr_code_url,
          expiresAt: tx.expires_at,
          status: data.status,
        });
      }
    } catch {
      // fall through to create new order
    }
  }

  // Criar nova ordem no Pagar.me
  const nivelLabel = laudo.nivel === 1 ? "Laudo Digital BLC" : "Laudo BLC + Consulta com Especialista";
  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "https://www.buscaleiloescaixa.com.br";

  const orderBody = {
    items: [
      {
        amount: PRECOS[laudo.nivel],
        description: nivelLabel,
        quantity: 1,
        code: `LAUDO-N${laudo.nivel}`,
      },
    ],
    customer: {
      name: laudo.userName || "Cliente BLC",
      email: laudo.userEmail,
      type: "individual",
    },
    payments: [
      {
        payment_method: "pix",
        pix: {
          expires_in: 3600, // 1 hora
          additional_information: [
            { name: "Imóvel", value: laudo.imovelDescricao.slice(0, 50) },
          ],
        },
      },
    ],
    metadata: {
      laudo_id: laudoId,
      user_id: session.user.id,
      imovel_id: laudo.imovelId,
    },
    closed: false,
    antifraud_enabled: false,
  };

  let res: Response;
  try {
    res = await fetch("https://api.pagar.me/core/v5/orders", {
      method: "POST",
      headers: {
        Authorization: pagarmeAuth(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderBody),
    });
  } catch (err) {
    console.error("[laudos/checkout] Pagar.me fetch error:", err);
    return NextResponse.json({ error: "Erro ao conectar com gateway de pagamento" }, { status: 502 });
  }

  if (!res.ok) {
    const errBody = await res.text();
    console.error("[laudos/checkout] Pagar.me error:", res.status, errBody);
    return NextResponse.json({ error: "Erro no gateway de pagamento", detail: errBody }, { status: 502 });
  }

  const data = await res.json();
  const charge = data.charges?.[0];
  const tx = charge?.last_transaction;

  if (!tx?.qr_code) {
    console.error("[laudos/checkout] QR code não retornado:", JSON.stringify(data));
    return NextResponse.json({ error: "QR code PIX não gerado pelo gateway" }, { status: 502 });
  }

  // Salvar IDs no laudo
  await updateLaudo(laudoId, {
    pagarmeOrderId: data.id,
    pagarmeChargeId: charge.id,
  });

  return NextResponse.json({
    orderId: data.id,
    chargeId: charge.id,
    qrCode: tx.qr_code,
    qrCodeUrl: tx.qr_code_url,
    expiresAt: tx.expires_at,
    status: data.status,
    baseUrl,
  });
}
