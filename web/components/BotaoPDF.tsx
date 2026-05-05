"use client";

import { useState } from "react";
import { Imovel } from "@/lib/types";

export default function BotaoPDF({ imovel }: { imovel: Imovel }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const [renderer, { ImovelPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/PdfImovelDoc"),
      ]);

      // Busca a foto via proxy (server-side, sem CORS) e converte para data URL
      let fotoDataUrl: string | undefined;
      if (imovel.fotoUrl) {
        try {
          const proxyUrl = `${window.location.origin}/api/proxy-imagem?url=${encodeURIComponent(imovel.fotoUrl)}`;
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const uint8 = new Uint8Array(buf);
            let bin = "";
            for (let i = 0; i < uint8.length; i++) bin += String.fromCharCode(uint8[i]);
            const contentType = res.headers.get("content-type") || "image/jpeg";
            fotoDataUrl = `data:${contentType};base64,${btoa(bin)}`;
          }
        } catch {
          // sem foto no PDF
        }
      }

      const imovelParaPDF = { ...imovel, fotoUrl: fotoDataUrl };

      const { createElement } = await import("react");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await renderer.pdf(createElement(ImovelPDF, { imovel: imovelParaPDF }) as any).toBlob();

      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `imovel-caixa-${imovel.hdnImovel}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {loading ? (
        <>
          <svg className="animate-spin w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Gerando PDF...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          Exportar PDF
        </>
      )}
    </button>
  );
}
