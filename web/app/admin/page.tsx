"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BlogPost } from "@/lib/blog";
import { Corretor } from "@/lib/corretores";

function fmtData(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtDataISO(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

type Tab = "blog" | "corretores";

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("blog");

  // Blog state
  const [posts,     setPosts]     = useState<BlogPost[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [syncing,   setSyncing]   = useState(false);
  const [syncMsg,   setSyncMsg]   = useState("");

  // Corretores state
  const [corretores,    setCorretores]    = useState<Corretor[]>([]);
  const [loadingCorr,   setLoadingCorr]   = useState(true);

  async function loadPosts() {
    const res = await fetch("/api/admin/posts");
    if (!res.ok) { router.push("/admin/login"); return; }
    setPosts(await res.json());
    setLoading(false);
  }

  async function loadCorretores() {
    const res = await fetch("/api/admin/corretores");
    if (!res.ok) return;
    setCorretores(await res.json());
    setLoadingCorr(false);
  }

  useEffect(() => {
    loadPosts();
    loadCorretores();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Blog actions
  async function togglePublicado(post: BlogPost) {
    await fetch(`/api/admin/posts/${post._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicado: !post.publicado }),
    });
    loadPosts();
  }

  async function excluirPost(id: string, titulo: string) {
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

  // Corretores actions
  async function aprovarCorretor(id: string) {
    await fetch(`/api/admin/corretores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aprovado: true }),
    });
    loadCorretores();
  }

  async function rejeitarCorretor(id: string, nome: string) {
    if (!confirm(`Rejeitar e excluir cadastro de "${nome}"?`)) return;
    await fetch(`/api/admin/corretores/${id}`, { method: "DELETE" });
    loadCorretores();
  }

  async function excluirCorretor(id: string, nome: string) {
    if (!confirm(`Excluir corretor "${nome}"?`)) return;
    await fetch(`/api/admin/corretores/${id}`, { method: "DELETE" });
    loadCorretores();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const publicados  = posts.filter((p) => p.publicado).length;
  const rascunhos   = posts.filter((p) => !p.publicado).length;
  const pendentes   = corretores.filter((c) => !c.aprovado).length;
  const aprovados   = corretores.filter((c) => c.aprovado).length;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Painel Admin</h1>
          <p className="text-sm text-gray-500 mt-1">
            Blog: {publicados} publicado{publicados !== 1 ? "s" : ""} · {rascunhos} rascunho{rascunhos !== 1 ? "s" : ""}
            {pendentes > 0 && (
              <span className="ml-2 text-amber-600 font-medium">· {pendentes} corretor{pendentes !== 1 ? "es" : ""} aguardando aprovação</span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <a href="/blog" target="_blank" className="text-sm text-blue-600 hover:underline px-3 py-2">
            Ver blog →
          </a>
          <a href="/corretores" target="_blank" className="text-sm text-blue-600 hover:underline px-3 py-2">
            Ver corretores →
          </a>
          <button onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border rounded-lg">
            Sair
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        <button onClick={() => setTab("blog")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
            tab === "blog"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>
          Blog
        </button>
        <button onClick={() => setTab("corretores")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 relative ${
            tab === "corretores"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>
          Corretores
          {pendentes > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
              {pendentes}
            </span>
          )}
        </button>
      </div>

      {/* Blog Tab */}
      {tab === "blog" && (
        <>
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
                          <a href={`/admin/posts/${post._id}`} className="text-xs text-blue-600 hover:underline">
                            Editar
                          </a>
                          <button onClick={() => excluirPost(post._id, post.titulo)}
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
        </>
      )}

      {/* Corretores Tab */}
      {tab === "corretores" && (
        <>
          {/* Pendentes */}
          {pendentes > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">
                Aguardando aprovação ({pendentes})
              </h2>
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">Categoria</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium">CRECI</th>
                      <th className="px-4 py-3 font-medium">Enviado</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {corretores.filter((c) => !c.aprovado).map((c) => (
                      <tr key={c._id} className="border-b last:border-0 hover:bg-amber-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{c.nome}</p>
                          <p className="text-xs text-gray-400">{c.cidade}</p>
                        </td>
                        <td className="px-4 py-3">
                          {c.categoria === "credenciado_caixa"
                            ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Credenciado</span>
                            : <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Geral</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c.estado}</td>
                        <td className="px-4 py-3 text-gray-600">{c.creci}</td>
                        <td className="px-4 py-3 text-gray-500">{fmtDataISO(c.criadoEm)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => aprovarCorretor(c._id)}
                              className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded font-medium transition-colors">
                              Aprovar
                            </button>
                            <button onClick={() => rejeitarCorretor(c._id, c.nome)}
                              className="text-xs bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded font-medium transition-colors">
                              Rejeitar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Aprovados */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Aprovados ({aprovados})
            </h2>
            {loadingCorr ? (
              <p className="text-gray-400 text-center py-10">Carregando...</p>
            ) : aprovados === 0 ? (
              <p className="text-gray-400 text-center py-10">Nenhum corretor aprovado ainda.</p>
            ) : (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">Categoria</th>
                      <th className="px-4 py-3 font-medium">Cidade / Estado</th>
                      <th className="px-4 py-3 font-medium">CRECI</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {corretores.filter((c) => c.aprovado).map((c) => (
                      <tr key={c._id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <a href={`/corretores/${c.slug}`} target="_blank"
                            className="font-medium text-gray-800 hover:text-blue-600 hover:underline">
                            {c.nome}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          {c.categoria === "credenciado_caixa"
                            ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Credenciado</span>
                            : <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Geral</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c.cidade} / {c.estado}</td>
                        <td className="px-4 py-3 text-gray-600">{c.creci}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => excluirCorretor(c._id, c.nome)}
                            className="text-xs text-red-500 hover:underline">
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
