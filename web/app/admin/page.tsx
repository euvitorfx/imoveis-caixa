"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BlogPost } from "@/lib/blog";
import { Corretor, CategoriaCorretor } from "@/lib/corretores";
import AdminUsuarios from "./AdminUsuarios";

const ESTADOS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const ESPECIALIDADES_OPCOES = [
  "Imóveis de Leilão","Venda Direta Caixa","Financiamento FGTS",
  "Imóveis Residenciais","Imóveis Comerciais","Terrenos e Lotes",
  "Imóveis na Planta","Avaliação de Imóveis",
];

function FormNovoCorretor({ onSuccess }: { onSuccess: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [form, setForm] = useState({
    nome: "", creci: "", categoria: "corretor_geral" as CategoriaCorretor,
    cidade: "", estado: "SP", bio: "",
    whatsapp: "", instagram: "", email: "", website: "", foto: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleEsp(e: string) {
    setEspecialidades((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setErro("");
    setEnviando(true);
    const res = await fetch("/api/admin/corretores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, especialidades }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) { setErro(data.error || "Erro ao salvar."); return; }
    setForm({ nome: "", creci: "", categoria: "corretor_geral", cidade: "", estado: "SP", bio: "", whatsapp: "", instagram: "", email: "", website: "", foto: "" });
    setEspecialidades([]);
    onSuccess();
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome completo *</label>
          <input required value={form.nome} onChange={(e) => set("nome", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">CRECI *</label>
          <input required value={form.creci} onChange={(e) => set("creci", e.target.value)}
            placeholder="Ex: 12345-F/SP"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Categoria *</label>
          <select value={form.categoria} onChange={(e) => set("categoria", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="credenciado_caixa">Credenciado Caixa</option>
            <option value="corretor_geral">Corretor Geral</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Estado *</label>
          <select value={form.estado} onChange={(e) => set("estado", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Cidade *</label>
          <input required value={form.cidade} onChange={(e) => set("cidade", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Mini bio</label>
          <textarea rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)}
            placeholder="Experiência, especialização, diferenciais..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp</label>
          <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)}
            placeholder="5511999999999"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Instagram</label>
          <input value={form.instagram} onChange={(e) => set("instagram", e.target.value)}
            placeholder="@seuperfil"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">E-mail profissional</label>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Site / Link profissional</label>
          <input value={form.website} onChange={(e) => set("website", e.target.value)}
            placeholder="https://..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">URL da foto de perfil</label>
          <input value={form.foto} onChange={(e) => set("foto", e.target.value)}
            placeholder="https://..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Especialidades</label>
        <div className="flex flex-wrap gap-2">
          {ESPECIALIDADES_OPCOES.map((e) => (
            <button key={e} type="button" onClick={() => toggleEsp(e)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                especialidades.includes(e)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
              }`}>
              {e}
            </button>
          ))}
        </div>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={enviando}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors">
          {enviando ? "Salvando..." : "Cadastrar parceiro"}
        </button>
      </div>
      <p className="text-xs text-gray-400">O corretor será cadastrado diretamente como aprovado e aparecerá no site.</p>
    </form>
  );
}

function fmtData(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtDataISO(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

type Tab = "blog" | "corretores" | "usuarios";

type UserStats = {
  total: number;
  premium: number;
  gratuito: number;
  comTelefone: number;
  recentes: { _id: string; name: string; email: string; telefone?: string; plano: string; criadoEm?: string }[];
};

// UserStats is kept here so the header can show totals; CRUD is handled in AdminUsuarios

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
  const [showFormCorr,  setShowFormCorr]  = useState(false);
  const [cadastroMsg,   setCadastroMsg]   = useState("");

  // Usuários state
  const [userStats,      setUserStats]      = useState<UserStats | null>(null);
  const [loadingUsers,   setLoadingUsers]   = useState(true);

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

  async function loadUsuarios() {
    const res = await fetch("/api/admin/usuarios");
    if (!res.ok) return;
    setUserStats(await res.json());
    setLoadingUsers(false);
  }

  useEffect(() => {
    loadPosts();
    loadCorretores();
    loadUsuarios();
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
            {userStats && (
              <span className="ml-2 text-blue-700 font-medium">
                · {userStats.total} usuário{userStats.total !== 1 ? "s" : ""} ({userStats.premium} premium)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
          <a href="/admin/status"
            className="text-sm font-semibold px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
            ⚡ Status
          </a>
          <a href="/admin/social"
            className="text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: "#F59E0B", color: "#1C1917" }}>
            📱 Social Média
          </a>
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
        <button onClick={() => setTab("usuarios")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
            tab === "usuarios"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>
          Usuários
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

      {/* Usuários Tab */}
      {tab === "usuarios" && (
        <AdminUsuarios stats={userStats} loading={loadingUsers} onRefresh={loadUsuarios} />
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

          {/* Formulário de cadastro manual */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Cadastrar novo parceiro
              </h2>
              <button onClick={() => { setShowFormCorr((v) => !v); setCadastroMsg(""); }}
                className="text-sm text-blue-600 hover:underline">
                {showFormCorr ? "Fechar" : "+ Novo cadastro"}
              </button>
            </div>
            {cadastroMsg && (
              <p className="text-sm text-green-600 mb-3">{cadastroMsg}</p>
            )}
            {showFormCorr && (
              <div className="bg-gray-50 border rounded-xl p-5">
                <FormNovoCorretor onSuccess={() => {
                  setShowFormCorr(false);
                  setCadastroMsg("✓ Corretor cadastrado e publicado com sucesso.");
                  loadCorretores();
                }} />
              </div>
            )}
          </div>

          {/* Aprovados */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Parceiros ativos ({aprovados})
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
