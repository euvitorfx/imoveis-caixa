"use client";

import { useState, useEffect } from "react";

interface Props {
  titulo: string;
  preco: string;
  endereco: string;
}

export default function BotaoCompartilhar({ titulo, preco, endereco }: Props) {
  const [copiado,  setCopiado]  = useState(false);
  const [url,      setUrl]      = useState("");
  const [waLink,   setWaLink]   = useState("https://wa.me/");
  const [temShare, setTemShare] = useState(false);

  useEffect(() => {
    const href = window.location.href;
    setUrl(href);
    const texto = `🏠 ${titulo} — ${preco}\n📍 ${endereco}\n🔗 ${href}`;
    setWaLink(`https://wa.me/?text=${encodeURIComponent(texto)}`);
    setTemShare(!!navigator.share);
  }, [titulo, preco, endereco]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: titulo, text: `${preco} — ${endereco}`, url });
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {/* WhatsApp */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        WhatsApp
      </a>

      {/* Copiar link */}
      <button
        onClick={copiar}
        className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {copiado ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-600">Link copiado!</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copiar link
          </>
        )}
      </button>

      {/* Share nativo (mobile) — só aparece após hydration */}
      {temShare && (
        <button
          onClick={nativeShare}
          className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Compartilhar
        </button>
      )}
    </div>
  );
}
