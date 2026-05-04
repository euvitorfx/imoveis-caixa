"use client";

import { useEffect } from "react";

export default function RegistraVisita() {
  useEffect(() => {
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
