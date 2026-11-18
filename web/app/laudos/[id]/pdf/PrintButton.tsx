"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{ padding: "8px 20px", borderRadius: 10, background: "#01304D", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}
    >
      📄 Imprimir / Salvar PDF
    </button>
  );
}
