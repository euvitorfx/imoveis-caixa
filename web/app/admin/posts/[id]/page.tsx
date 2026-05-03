"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { BlogPost } from "@/lib/blog";

export default function EditarPostPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Partial<BlogPost>>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [erro,    setErro]    = useState("");

  useEffect(() => {
    fetch("/api/admin/posts").then((r) => r.json()).then((posts: BlogPost[]) => {
      const post = posts.find((p) => p._id === id);
      if (post) setForm(post);
      setLoading(false);
    });
  }, [id]);

  function set(k: string, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function salvar() {
    setSaving(true);
    const res = await fetch(`/api/admin/posts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { router.push("/admin"); }
    else { setErro("Erro ao salvar."); setSaving(false); }
  }

  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const ta  = `${inp} resize-none`;

  if (loading) return <div className="text-center py-20 text-gray-400">Carregando...</div>;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Editar Post</h1>
        <a href="/admin" className="text-sm text-gray-500 hover:underline">← Voltar</a>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Título</label>
          <input className={inp} value={form.titulo || ""} onChange={(e) => set("titulo", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Slug</label>
          <input className={inp} value={form.slug || ""} onChange={(e) => set("slug", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Resumo</label>
          <textarea className={ta} rows={2} value={form.resumo || ""} onChange={(e) => set("resumo", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Conteúdo</label>
          <textarea className={ta} rows={14} value={form.conteudo || ""} onChange={(e) => set("conteudo", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">URL da imagem de capa</label>
            <input className={inp} value={form.imagem || ""} onChange={(e) => set("imagem", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Data</label>
            <input type="date" className={inp} value={form.data || ""} onChange={(e) => set("data", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Tempo de leitura</label>
            <input className={inp} value={form.leitura || ""} onChange={(e) => set("leitura", e.target.value)} />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.publicado ?? false} onChange={(e) => set("publicado", e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-gray-700">Publicado</span>
            </label>
          </div>
        </div>

        {erro && <p className="text-red-500 text-xs">{erro}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={salvar} disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
          <a href="/admin" className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">Cancelar</a>
        </div>
      </div>
    </div>
  );
}
