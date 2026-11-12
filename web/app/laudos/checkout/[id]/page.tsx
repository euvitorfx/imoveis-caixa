"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();

  const [laudo, setLaudo] = useState<LaudoInfo | null>(null);
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagandoCartao, setPagandoCartao] = useState(false);
  const [voltandoDoCartao, setVoltandoDoCartao] = useState(false);
  const [pixExpirado, setPixExpirado] = useState(false);

  const pagoParam = searchParams.get("pago");
  const erroParam = searchParams.get("erro");

  const checkStatus = useCallback(async () => {
    const r = await fetch(`/api/laudos/${id}/status`);
    const data = await r.json();
    if (data.status && data.status !== "aguardando_pagamento") {
      router.replace(`/laudos/${id}`);
    }
  }, [id, router]);

  // Buscar info do laudo e gerar QR PIX
  useEffect(() => {
    // Se voltou do MP com pago=1, polling imediato
    if (pagoParam === "1") {
      setVoltandoDoCartao(true);
      setLoading(false);
      // Polling agressivo por 20s esperando webhook
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        await checkStatus();
        if (attempts >= 20) clearInterval(poll);
      }, 1000);
      return () => clearInterval(poll);
    }

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
        if (data.status !== "aguardando_pagamento") {
          router.replace(`/laudos/${id}`);
          return;
        }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Polling de status enquanto QR code estiver visível (para quando expirar)
  useEffect(() => {
    if (!checkout || pixExpirado) return;
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkout, checkStatus, pixExpirado]);

  // Detectar expiração do QR PIX
  useEffect(() => {
    if (!checkout?.expiresAt) return;
    const check = () => {
      if (new Date(checkout.expiresAt) <= new Date()) setPixExpirado(true);
    };
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, [checkout?.expiresAt]);

  async function gerarNovoQr() {
    setPixExpirado(false);
    setCheckout(null);
    setLoading(true);
    try {
      const r = await fetch("/api/laudos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ laudoId: id }),
      });
      const data = await r.json();
      if (data.error) { setError(data.error); return; }
      setCheckout(data);
    } catch {
      setError("Erro ao gerar novo QR code");
    } finally {
      setLoading(false);
    }
  }

  async function copiar() {
    if (!checkout?.qrCode) return;
    await navigator.clipboard.writeText(checkout.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  async function pagarCartao() {
    setPagandoCartao(true);
    try {
      const r = await fetch("/api/laudos/cartao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ laudoId: id }),
      });
      const data = await r.json();
      if (data.initPoint) {
        window.location.href = data.initPoint;
      } else {
        setError(data.error ?? "Erro ao abrir pagamento com cartão");
        setPagandoCartao(false);
      }
    } catch {
      setError("Erro ao conectar ao servidor");
      setPagandoCartao(false);
    }
  }

  const valorFmt = laudo
    ? (laudo.preco / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "";

  // Voltando do MP após cartão
  if (voltandoDoCartao) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-3">
        <div className="text-4xl">⏳</div>
        <p className="font-semibold text-gray-700">Confirmando seu pagamento...</p>
        <p className="text-sm text-gray-400">Aguarde, isso pode levar alguns segundos.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-gray-500">Gerando QR code PIX...</p>
      </div>
    );
  }

  if (erroParam === "pagamento") {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-3">
        <div className="text-4xl">❌</div>
        <p className="font-semibold text-gray-700">Pagamento não concluído</p>
        <p className="text-sm text-gray-400">O pagamento foi cancelado ou recusado. Você pode tentar novamente.</p>
        <button
          onClick={() => router.replace(`/laudos/checkout/${id}`)}
          className="mt-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: "#01304D" }}
        >
          Tentar novamente
        </button>
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
          <p className="text-xs text-gray-400 uppercase tracking-wide">Valor total</p>
          <p className="text-3xl font-bold" style={{ color: "#01304D" }}>{valorFmt}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Pagamento seguro via</p>
          <p className="font-bold text-gray-700">Mercado Pago</p>
        </div>
      </div>

      {/* Opções de pagamento */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-5 pt-4 pb-2">
          <p className="text-sm font-semibold text-gray-700">Escolha como pagar</p>
        </div>

        {/* Cartão */}
        <div className="px-5 pb-4">
          <button
            onClick={pagarCartao}
            disabled={pagandoCartao}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 font-semibold text-sm transition-all disabled:opacity-60"
            style={{ borderColor: "#01304D", color: "#01304D" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">💳</span>
              <div className="text-left">
                <p className="font-bold">Cartão de crédito</p>
                <p className="text-xs font-normal text-gray-400">Visa, Mastercard, Elo e outros</p>
              </div>
            </div>
            <span>{pagandoCartao ? "Aguarde..." : "→"}</span>
          </button>
        </div>

        <div className="flex items-center gap-3 px-5 pb-4">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 shrink-0">ou pague com PIX</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* PIX */}
        {checkout && (
          <div className="px-5 pb-5 space-y-4">
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Escaneie o QR code com o app do seu banco
              </p>
              {checkout.qrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={checkout.qrCodeUrl}
                  alt="QR Code PIX"
                  className="w-44 h-44 mx-auto border border-gray-100 rounded-xl"
                />
              ) : (
                <div className="w-44 h-44 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
                  <span className="text-gray-400 text-sm">QR code indisponível</span>
                </div>
              )}
            </div>

            {!pixExpirado && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5 text-center">Ou use o Pix Copia e Cola:</p>
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
            )}

            {pixExpirado ? (
              <div className="text-center space-y-3 py-2">
                <p className="text-sm font-semibold text-red-500">⏰ QR Code expirado</p>
                <p className="text-xs text-gray-400">O código PIX expirou. Gere um novo para continuar.</p>
                <button
                  onClick={gerarNovoQr}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: "#01304D" }}
                >
                  🔄 Gerar novo QR Code
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                <span>🔄</span>
                <span>Verificando pagamento automaticamente...</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Instruções PIX */}
      {checkout && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}>
          <p className="font-semibold text-blue-800 mb-1">Como pagar com PIX</p>
          <ol className="text-blue-700 space-y-1 text-xs list-decimal list-inside">
            <li>Abra o app do seu banco</li>
            <li>Escolha &ldquo;Pagar com PIX&rdquo;</li>
            <li>Escaneie o QR code ou cole o código</li>
            <li>Confirme o pagamento</li>
          </ol>
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        Pagamento processado com segurança via Mercado Pago
      </p>
    </div>
  );
}
