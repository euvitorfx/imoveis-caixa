"use client";

import { useEffect } from "react";

const QUEUE_KEY = "blc_funil_queue";
const MAX_AGE_MS = 10 * 60 * 1000; // descarta eventos com mais de 10 min

type PendingEvent = {
  tipo: string;
  imovelId: string;
  nivel?: number;
  anonId?: string;
  ts: number;
};

export function enqueueClick(tipo: string, imovelId: string, nivel?: number, anonId?: string) {
  try {
    const event: PendingEvent = { tipo, imovelId, nivel, anonId, ts: Date.now() };
    const existing: PendingEvent[] = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    existing.push(event);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(existing));
  } catch {}
}

async function flush() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    const events: PendingEvent[] = JSON.parse(raw);
    if (!events.length) return;

    const now = Date.now();
    const valid = events.filter((e) => now - e.ts < MAX_AGE_MS);

    // Limpa imediatamente para não reenviar se a página recarregar durante o fetch
    localStorage.removeItem(QUEUE_KEY);

    for (const e of valid) {
      const { ts: _ts, ...payload } = e;
      void fetch("/api/laudos/evento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true, // keepalive garante entrega mesmo com navegação
      }).catch(() => {});
    }
  } catch {}
}

// Componente global — colado no layout raiz
// Faz flush assim que qualquer página carrega
export default function FunilFlushQueue() {
  useEffect(() => {
    flush();
  }, []);
  return null;
}
