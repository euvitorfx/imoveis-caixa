"use client";

import { useEffect } from "react";

const BOT_UA = /bot|crawler|spider|slurp|scrapy|python|curl\/|wget\/|headless|prerender|phantom|selenium/i;

export default function RegistraVisita() {
  useEffect(() => {
    if (BOT_UA.test(navigator.userAgent)) return;

    const novaSessao = !sessionStorage.getItem("visitou");
    if (novaSessao) sessionStorage.setItem("visitou", "1");

    fetch("/api/visita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ novaSessao }),
    });
  }, []);

  return null;
}
