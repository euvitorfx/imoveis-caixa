"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BlogPost } from "@/lib/blog";

function fmtData(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function AdminPage() {
  const router = useRouter();
  const [posts,     setPosts]     = useState<BlogPost[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [syncing,   setSyncing]   = useState(false);
  const [syncMsg,   setSyncMsg]   = useState("");

  async function loadPosts() {
    const res = await fetch("/api/admin/posts");
    if (!res.ok) { router.push("/admin/login"); return; }
    setPosts(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadPosts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function togglePublicado(post: BlogPost) {
    await fetch(`/api/admin/posts/${post._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicado: !post.publicado }),
    });
    loadPosts();
  }

  async function excluir(id: string, titulo: string) {
    if (!confirm(`Excluir "${titulo}"?`)) return;
    await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
    loadPosts();
  }

  async function syncYoutube() {
    setSyncing(true);
    setSyncMsg("");
    const res = await fetch("/api/admin/youtube-sync", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setSyncMsg(`✓ ${data.criados} novo(s) vídeo(s) importado(s) como rascunho.`);
      loadPosts();
    } else {
      setSyncMsg(`✗ Erro: ${data.error}`);
    }
    setSyncing(false);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const publicados = posts.filter((p) => p.publicado).length;
  const rascunhos  = posts.filter((p) => !p.publicado).length;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Painel Admin — Blog</h1>
          <p className="text-sm text-gray-500 mt-1">
            {publicados} publicado{publicados !== 1 ? "s" : ""} · {rascunhos} rascunho{rascunhos !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <a href="/blog" target="_blank"
            className="text-sm text-blue-600 hover:underline px-3 py-2">
            Ver blog →
          </a>
          <button onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border rounded-lg">
            Sair
          </button>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-3 mb-6">
        <a href="/admin/posts/novo"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
          + Novo post
        </a>
        <button onClick={syncYoutube} disabled={syncing}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          {syncing ? "Sincronizando..." : "▶ Sync YouTube"}
        </button>
        {syncMsg && <p className="text-sm text-gray-600 self-center">{syncMsg}</p>}
      </div>

      {/* Lista de posts */}
      {loading ? (
        <p className="text-gray-400 text-center py-10">Carregando...</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-400 text-center py-10">Nenhum post ainda.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium text-gray-800 truncate">{post.titulo}</p>
                    <p className="text-xs text-gray-400 truncate">/blog/{post.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    {post.tipo === "youtube"
                      ? <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">YouTube</span>
                      : <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Manual</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtData(post.data)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => togglePublicado(post)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                        post.publicado
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                      }`}>
                      {post.publicado ? "Publicado" : "Rascunho"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      <a href={`/admin/posts/${post._id}`}
                        className="text-xs text-blue-600 hover:underline">
                        Editar
                      </a>
                      <button onClick={() => excluir(post._id, post.titulo)}
                        className="text-xs text-red-500 hover:underline">
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
