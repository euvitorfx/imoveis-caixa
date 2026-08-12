"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function FotoForm({ fotoAtual, inicial }: { fotoAtual?: string; inicial: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErro("Arquivo muito grande. Máximo 5 MB."); return; }
    setErro("");
    setPreview(URL.createObjectURL(file));
  }

  async function enviar() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setErro("");
    const fd = new FormData();
    fd.append("foto", file);
    const res = await fetch("/api/perfil/foto", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setErro(data.error || "Erro ao enviar foto."); return; }
    setPreview(null);
    router.refresh();
  }

  const src = preview ?? fotoAtual;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar */}
      <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Foto de perfil" className="w-20 h-20 rounded-full object-cover ring-2 ring-gray-200" />
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white ring-2 ring-gray-200"
            style={{ backgroundColor: "#01304D" }}
          >
            {inicial}
          </div>
        )}
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs font-medium">Alterar</span>
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      {preview && (
        <div className="flex gap-2">
          <button
            onClick={enviar}
            disabled={uploading}
            className="text-xs font-medium px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {uploading ? "Enviando..." : "Salvar foto"}
          </button>
          <button
            onClick={() => { setPreview(null); if (inputRef.current) inputRef.current.value = ""; }}
            className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {!preview && (
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {fotoAtual ? "Alterar foto" : "Adicionar foto"}
        </button>
      )}

      {erro && <p className="text-xs text-red-500">{erro}</p>}
    </div>
  );
}
