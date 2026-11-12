"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

type CheckoutData = {
  qrCode: string;
  qrCodeUrl: string;
  expiresAt: string;
  orderId: string;
};

type LaudoInfo = {
  imovelDescricao: string;
  nivel: 1 | 2;
  preco: number;
  status: string;
};

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [laudo, setLaudo] = useState<LaudoInfo | null>(null);
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar info do laudo
  useEffect(() => {
    fetch(`/api/laudos/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        setLaudo({
          imovelDescricao: data.imovelDescricao,
          nivel: data.nivel,
          preco: data.preco,
          status: data.status,
        });
        // Se já pago, redirecionar
        if (data.status !== "aguardando_pagamento") {
          router.replace(`/laudos/${id}`);
          return;
        }
        // Gerar QR code PIX
        return fetch("/api/laudos/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ laudoId: id }),
        });
      })
      .then((r) => r?.json())
      .then((data) => {
        if (!data) return;
        if (data.error) { setError(data.error); return; }
        setCheckout(data);
      })
      .catch(() => setError("Erro ao carregar checkout"))
      .finally(() => setLoading(false));
  }, [id, router]);

  // Polling do status de pagamento a cada 5s
  const checkStatus = useCallback(async () => {
    const r = await fetch(`/api/laudos/${id}/status`);
    const data = await r.json();
    if (data.status && data.status !== "aguardando_pagamento") {
      router.replace(`/laudos/${id}`);
    }
  }, [id, router]);

  useEffect(() => {
    if (!checkout) return;
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkout, checkStatus]);

  async function copiar() {
    if (!checkout?.qrCode) return;
    await navigator.clipboard.writeText(checkout.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  const valorFmt = laudo
    ? (laudo.preco / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "";

  if (loading) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-gray-500">Gerando QR code PIX...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-4xl mb-4">❌</div>
        <p className="text-red-600">{error}</p>
        <a href="/" className="mt-4 inline-block text-sm underline" style={{ color: "#01304D" }}>
          Voltar ao início
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: "#01304D" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#F59E0B" }}>
          Pagamento
        </p>
        <h1 className="text-white font-bold text-xl leading-tight">
          {laudo?.nivel === 1 ? "Laudo Digital BLC" : "Laudo BLC + Consulta"}
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>
          {laudo?.imovelDescricao}
        </p>
      </div>

      {/* Valor */}
      <div className="bg-white rounded-2xl shadow p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Valor</p>
          <p className="text-3xl font-bold" style={{ color: "#01304D" }}>{valorFmt}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Pagamento via</p>
          <p className="font-bold text-gray-700">PIX</p>
          <p className="text-xs text-gray-400">instantâneo</p>
        </div>
      </div>

      {checkout && (
        <>
          {/* QR Code */}
          <div className="bg-white rounded-2xl shadow p-5 text-center">
            <p className="text-sm font-semibold text-gray-700 mb-4">
              Escaneie o QR code com o app do seu banco
            </p>
            {checkout.qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={checkout.qrCodeUrl}
                alt="QR Code PIX"
                className="w-48 h-48 mx-auto border border-gray-100 rounded-xl"
              />
            ) : (
              <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
                <span className="text-gray-400 text-sm">QR code indisponível</span>
              </div>
            )}

            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">Ou copie o código Pix Copia e Cola:</p>
              <div className="flex gap-2">
                <input
                  value={checkout.qrCode}
                  readOnly
                  className="flex-1 text-xs border rounded-lg px-3 py-2 text-gray-700 bg-gray-50 truncate"
                />
                <button
                  onClick={copiar}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-white shrink-0 transition-colors"
                  style={{ backgroundColor: copied ? "#059669" : "#01304D" }}
                >
                  {copied ? "✓ Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
              <span>🔄</span>
              <span>Verificando pagamento automaticamente...</span>
            </p>
          </div>

          {/* Instruções */}
          <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <p className="font-semibold text-blue-800 mb-1">Como pagar com PIX</p>
            <ol className="text-blue-700 space-y-1 text-xs list-decimal list-inside">
              <li>Abra o app do seu banco</li>
              <li>Escolha &ldquo;Pagar com PIX&rdquo;</li>
              <li>Escaneie o QR code ou cole o código</li>
              <li>Confirme o pagamento</li>
            </ol>
          </div>
        </>
      )}

      <p className="text-center text-xs text-gray-400">
        Pagamento processado com segurança via Pagar.me
      </p>
    </div>
  );
}
