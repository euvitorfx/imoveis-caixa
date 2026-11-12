"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

const ESTRELAS: { nota: 1 | 2 | 3 | 4 | 5; label: string; emoji: string }[] = [
  { nota: 1, label: "Ruim", emoji: "😞" },
  { nota: 2, label: "Regular", emoji: "😐" },
  { nota: 3, label: "Bom", emoji: "🙂" },
  { nota: 4, label: "Ótimo", emoji: "😄" },
  { nota: 5, label: "Excelente", emoji: "🤩" },
];

export default function AvaliacaoPage() {
  const { id } = useParams<{ id: string }>();
  const [nota, setNota] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<"form" | "sucesso" | "erro">("form");
  const [erroMsg, setErroMsg] = useState("");

  async function enviar() {
    if (!nota) return;
    setEnviando(true);
    try {
      const r = await fetch(`/api/laudos/${id}/avaliacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota, comentario: comentario.trim() || undefined }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErroMsg(data.error ?? "Erro ao enviar avaliação");
        setEstado(r.status === 409 ? "sucesso" : "erro");
      } else {
        setEstado("sucesso");
      }
    } catch {
      setErroMsg("Erro de conexão. Tente novamente.");
      setEstado("erro");
    } finally {
      setEnviando(false);
    }
  }

  const ativo = hover ?? nota ?? 0;

  if (estado === "sucesso") {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4 px-4">
        <div className="text-6xl">🙏</div>
        <h1 className="text-2xl font-bold" style={{ color: "#01304D" }}>
          Obrigado pela avaliação!
        </h1>
        <p className="text-gray-500 text-sm">
          Seu feedback nos ajuda a melhorar o serviço e ajudar mais pessoas a arrematar com segurança.
        </p>
        <a
          href="/"
          className="inline-block mt-4 text-sm font-semibold px-6 py-2.5 rounded-xl text-white"
          style={{ backgroundColor: "#01304D" }}
        >
          🏠 Voltar ao início
        </a>
      </div>
    );
  }

  if (estado === "erro") {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4 px-4">
        <div className="text-5xl">❌</div>
        <p className="text-gray-700 font-semibold">{erroMsg}</p>
        <button
          onClick={() => setEstado("form")}
          className="text-sm underline"
          style={{ color: "#01304D" }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 py-10 px-4">
      {/* Header */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: "#01304D" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#F59E0B" }}>
          Laudo BLC
        </p>
        <h1 className="text-white font-bold text-xl leading-tight">
          Como foi sua experiência?
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
          Leva menos de 1 minuto. Sua opinião importa muito.
        </p>
      </div>

      {/* Estrelas */}
      <div className="bg-white rounded-2xl shadow p-6">
        <p className="text-sm font-semibold text-gray-700 mb-4 text-center">
          Avalie o Laudo BLC de 1 a 5 estrelas
        </p>
        <div className="flex justify-center gap-3 mb-3">
          {ESTRELAS.map(({ nota: n, emoji }) => (
            <button
              key={n}
              onClick={() => setNota(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(null)}
              className="text-4xl transition-transform hover:scale-125 focus:outline-none"
              style={{ opacity: n <= ativo ? 1 : 0.25, transform: n === ativo ? "scale(1.2)" : "" }}
              aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            >
              ⭐
            </button>
          ))}
        </div>
        {ativo > 0 && (
          <p className="text-center text-sm font-semibold" style={{ color: "#01304D" }}>
            {ESTRELAS[(ativo - 1)].emoji} {ESTRELAS[(ativo - 1)].label}
          </p>
        )}
      </div>

      {/* Comentário */}
      <div className="bg-white rounded-2xl shadow p-5">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Comentário <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="O que mais gostou? O que podemos melhorar?"
          rows={4}
          maxLength={500}
          className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2"
          style={{ "--tw-ring-color": "#F59E0B" } as React.CSSProperties}
        />
        <p className="text-xs text-gray-400 text-right mt-1">{comentario.length}/500</p>
      </div>

      {/* Botão */}
      <button
        onClick={enviar}
        disabled={!nota || enviando}
        className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
        style={{ backgroundColor: "#01304D" }}
      >
        {enviando ? "Enviando..." : "Enviar avaliação →"}
      </button>

      <p className="text-center text-xs text-gray-400">
        Dúvidas?{" "}
        <a href="mailto:atendimento@buscaleiloescaixa.com.br" className="underline" style={{ color: "#01304D" }}>
          atendimento@buscaleiloescaixa.com.br
        </a>
      </p>
    </div>
  );
}
