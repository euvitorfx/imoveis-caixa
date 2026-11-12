import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLaudoById, updateLaudo, PRECOS } from "@/lib/laudos";

function mpAuth() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não definida");
  return `Bearer ${token}`;
}

// POST /api/laudos/checkout
// Body: { laudoId }
// Cria um pagamento PIX no Mercado Pago e retorna os dados do QR code
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { laudoId } = await req.json();
  if (!laudoId) return NextResponse.json({ error: "laudoId obrigatório" }, { status: 400 });

  const laudo = await getLaudoById(laudoId);
  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });
  if (laudo.userId !== session.user.id) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  // Se já tem um pagamento MP pendente, reutiliza
  if (laudo.mpPaymentId) {
    try {
      const existing = await fetch(
        `https://api.mercadopago.com/v1/payments/${laudo.mpPaymentId}`,
        { headers: { Authorization: mpAuth() } }
      );
      if (existing.ok) {
        const data = await existing.json();
        const tx = data.point_of_interaction?.transaction_data;
        if (tx?.qr_code && data.status === "pending") {
          return NextResponse.json({
            orderId: String(data.id),
            qrCode: tx.qr_code,
            qrCodeUrl: tx.qr_code_base64
              ? `data:image/png;base64,${tx.qr_code_base64}`
              : "",
            expiresAt: data.date_of_expiration ?? "",
            status: data.status,
          });
        }
      }
    } catch {
      // cria novo pagamento
    }
  }

  const nivelLabel =
    laudo.nivel === 1
      ? "Laudo Digital BLC"
      : "Laudo BLC + Consulta com Especialista";

  const [firstName, ...rest] = (laudo.userName || "Cliente BLC").split(" ");

  const paymentBody = {
    transaction_amount: PRECOS[laudo.nivel] / 100, // MP usa BRL, não centavos
    description: `${nivelLabel} — ${laudo.imovelDescricao.slice(0, 100)}`,
    payment_method_id: "pix",
    payer: {
      email: laudo.userEmail,
      first_name: firstName || "Cliente",
      last_name: rest.join(" ") || "BLC",
    },
    external_reference: laudoId,
    date_of_expiration: new Date(Date.now() + 3600 * 1000).toISOString(),
  };

  let res: Response;
  try {
    res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: mpAuth(),
        "Content-Type": "application/json",
        "X-Idempotency-Key": laudoId,
      },
      body: JSON.stringify(paymentBody),
    });
  } catch (err) {
    console.error("[laudos/checkout] MP fetch error:", err);
    return NextResponse.json(
      { error: "Erro ao conectar com gateway de pagamento" },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const errBody = await res.text();
    console.error("[laudos/checkout] MP error:", res.status, errBody);
    return NextResponse.json(
      { error: "Erro no gateway de pagamento", detail: errBody, status_code: res.status },
      { status: 502 }
    );
  }

  const data = await res.json();
  const tx = data.point_of_interaction?.transaction_data;

  if (!tx?.qr_code) {
    console.error("[laudos/checkout] QR code não retornado:", JSON.stringify(data));
    return NextResponse.json({ error: "QR code PIX não gerado" }, { status: 502 });
  }

  await updateLaudo(laudoId, { mpPaymentId: String(data.id) });

  return NextResponse.json({
    orderId: String(data.id),
    qrCode: tx.qr_code,
    qrCodeUrl: tx.qr_code_base64
      ? `data:image/png;base64,${tx.qr_code_base64}`
      : "",
    expiresAt: data.date_of_expiration ?? "",
    status: data.status,
  });
}
