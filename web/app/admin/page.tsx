"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BlogPost } from "@/lib/blog";
import { Corretor } from "@/lib/corretores";
import AdminUsuarios from "./AdminUsuarios";
import AdminParceirosCRM from "./AdminParceirosCRM";
import AdminProcessos from "./AdminProcessos";
import AdminCobertura from "./AdminCobertura";

function fmtData(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

type Tab = "blog" | "corretores" | "usuarios" | "utm" | "processos" | "cobertura";

type UserStats = {
  total: number;
  premium: number;
  gratuito: number;
  comTelefone: number;
  recentes: { _id: string; name: string; email: string; telefone?: string; plano: string; criadoEm?: string }[];
};

// UserStats is kept here so the header can show totals; CRUD is handled in AdminUsuarios

const BASE = "https://buscaleiloescaixa.com.br";

const UTM_LINKS = [
  {
    titulo: "🏠 Link principal — Home",
    desc: "Use em todos os vídeos como link padrão na descrição",
    badge: "Principal",
    badgeClass: "bg-blue-100 text-blue-700",
    url: `${BASE}?utm_source=youtube&utm_medium=video&utm_campaign=canal`,
  },
  {
    titulo: "🆓 Cadastro — CTA direto",
    desc: "Para vídeos que falem sobre criar conta, favoritos ou ferramentas exclusivas",
    badge: "CTA",
    badgeClass: "bg-amber-100 text-amber-700",
    url: `${BASE}/cadastro?utm_source=youtube&utm_medium=video&utm_campaign=canal`,
  },
  {
    titulo: "📊 Ferramentas — Planilha de viabilidade",
    desc: "Para vídeos sobre análise financeira, calcular ROI ou custos de arrematação",
    badge: "Ferramenta",
    badgeClass: "bg-violet-100 text-violet-700",
    url: `${BASE}/ferramentas?utm_source=youtube&utm_medium=video&utm_campaign=ferramentas`,
  },
  {
    titulo: "🗺️ Mapa de imóveis",
    desc: "Para vídeos sobre como encontrar imóveis por localização",
    badge: "Mapa",
    badgeClass: "bg-green-100 text-green-700",
    url: `${BASE}/mapa?utm_source=youtube&utm_medium=video&utm_campaign=canal`,
  },
];

function UtmLinksTab() {
  const [copiado, setCopiado] = useState<string | null>(null);
  const [nomeVideo, setNomeVideo] = useState("");
  const [destino, setDestino] = useState("");

  function copiar(url: string, key: string) {
    navigator.clipboard.writeText(url);
    setCopiado(key);
    setTimeout(() => setCopiado(null), 2000);
  }

  const campaign = nomeVideo.trim().replace(/\s+/g, "-").toLowerCase() || "canal";
  const urlGerada = `${BASE}${destino}?utm_source=youtube&utm_medium=video&utm_campaign=${campaign}`;

  return (
    <div className="space-y-8">

      {/* Info */}
      <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-4 py-3 text-sm text-amber-800">
        <strong>Como funciona:</strong> o GA4 já está configurado no site. Use esses links nas descrições dos vídeos — cada visita aparecerá separada em <em>Aquisição → Campanhas</em> no Google Analytics.
      </div>

      {/* Links prontos */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Links prontos para usar</h2>
        <div className="space-y-3">
          {UTM_LINKS.map((l) => (
            <div key={l.url} className="bg-white rounded-xl shadow border p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{l.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{l.desc}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${l.badgeClass}`}>{l.badge}</span>
              </div>
              <div className="flex gap-2">
                <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 overflow-x-auto whitespace-nowrap">
                  {l.url}
                </code>
                <button
                  onClick={() => copiar(l.url, l.url)}
                  className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    copiado === l.url ? "bg-green-600 text-white" : "bg-gray-800 hover:bg-gray-700 text-white"
                  }`}
                >
                  {copiado === l.url ? "✓ Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gerador por vídeo */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Gerar link por vídeo</h2>
        <div className="bg-white rounded-xl shadow border p-4 space-y-4">
          <p className="text-xs text-gray-500">Cria um link único por vídeo — permite comparar no GA4 qual vídeo trouxe mais tráfego.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome do vídeo</label>
              <input
                value={nomeVideo}
                onChange={(e) => setNomeVideo(e.target.value)}
                placeholder="ex: como arrematar imovel caixa"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Página de destino</label>
              <select
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">/ — Home (busca de imóveis)</option>
                <option value="/cadastro">/cadastro — Criar conta grátis</option>
                <option value="/ferramentas">/ferramentas — Ferramentas</option>
                <option value="/mapa">/mapa — Mapa de imóveis</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 overflow-x-auto whitespace-nowrap">
              {urlGerada}
            </code>
            <button
              onClick={() => copiar(urlGerada, "gerado")}
              className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                copiado === "gerado" ? "bg-green-600 text-white" : "bg-gray-800 hover:bg-gray-700 text-white"
              }`}
            >
              {copiado === "gerado" ? "✓ Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      </div>

      {/* Como ver no GA4 */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Como ver no Google Analytics</h2>
        <div className="bg-white rounded-xl shadow border divide-y">
          {[
            ["1", "Acesse analytics.google.com e selecione a propriedade do site"],
            ["2", "Relatórios → Aquisição → Aquisição de tráfego — procure youtube / video na tabela"],
            ["3", "Para ver por vídeo: Relatórios → Aquisição → Campanhas — cada utm_campaign aparece separado"],
            ["4", "Métricas disponíveis: sessões, usuários, taxa de engajamento e conversões (cadastros)"],
          ].map(([n, txt]) => (
            <div key={n} className="flex items-start gap-3 px-4 py-3">
              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: "#01304D" }}>{n}</span>
              <p className="text-sm text-gray-600">{txt}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("usuarios");

  // Blog state
  const [posts,     setPosts]     = useState<BlogPost[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [syncing,   setSyncing]   = useState(false);
  const [syncMsg,   setSyncMsg]   = useState("");

  // Corretores state
  const [corretores,    setCorretores]    = useState<Corretor[]>([]);
  const [loadingCorr,   setLoadingCorr]   = useState(true);

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

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const publicados  = posts.filter((p) => p.publicado).length;
  const rascunhos   = posts.filter((p) => !p.publicado).length;
  const parceiros_fechados = corretores.filter((c) => c.status_relacionamento === "parceiro_fechado").length;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Painel Admin</h1>
          <p className="text-sm text-gray-500 mt-1">
            Blog: {publicados} publicado{publicados !== 1 ? "s" : ""} · {rascunhos} rascunho{rascunhos !== 1 ? "s" : ""}
            {parceiros_fechados > 0 && (
              <span className="ml-2 text-green-700 font-medium">· {parceiros_fechados} parceiro{parceiros_fechados !== 1 ? "s" : ""} ativo{parceiros_fechados !== 1 ? "s" : ""}</span>
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
        <button onClick={() => setTab("usuarios")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
            tab === "usuarios"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>
          Usuários
        </button>
        <button onClick={() => setTab("corretores")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 relative ${
            tab === "corretores"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>
          Parceiros CRM
          {corretores.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
              {corretores.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab("processos")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
            tab === "processos"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>
          Processos BLC
        </button>
        <button onClick={() => setTab("cobertura")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
            tab === "cobertura"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>
          🗺️ Cobertura
        </button>
        <button onClick={() => setTab("blog")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
            tab === "blog"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>
          Blog
        </button>
        <button onClick={() => setTab("utm")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
            tab === "utm"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>
          🔗 Links UTM
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

      {/* UTM Links Tab */}
      {tab === "utm" && <UtmLinksTab />}

      {/* Corretores Tab */}
      {tab === "corretores" && (
        <AdminParceirosCRM
          corretores={corretores}
          loading={loadingCorr}
          onRefresh={loadCorretores}
        />
      )}

      {/* Processos BLC Tab */}
      {tab === "processos" && <AdminProcessos />}

      {/* Cobertura Tab */}
      {tab === "cobertura" && <AdminCobertura />}
    </div>
  );
}
