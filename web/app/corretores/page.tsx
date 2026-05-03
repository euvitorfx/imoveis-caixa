"use client";

import { useEffect, useState } from "react";
import { Corretor, CategoriaCorretor } from "@/lib/corretores";

const ESTADOS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const ESPECIALIDADES_OPCOES = [
  "Imóveis de Leilão",
  "Venda Direta Caixa",
  "Financiamento FGTS",
  "Imóveis Residenciais",
  "Imóveis Comerciais",
  "Terrenos e Lotes",
  "Imóveis na Planta",
  "Avaliação de Imóveis",
];

function CategoriaTag({ categoria }: { categoria: CategoriaCorretor }) {
  if (categoria === "credenciado_caixa") {
    return (
      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
        Credenciado Caixa
      </span>
    );
  }
  return (
    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
      Corretor Geral
    </span>
  );
}

function CorretorCard({ c }: { c: Corretor }) {
  return (
    <a href={`/corretores/${c.slug}`}
      className="bg-white rounded-xl shadow hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <div className="flex items-center gap-4 p-4">
        {c.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.foto} alt={c.nome}
            className="w-16 h-16 rounded-full object-cover shrink-0 border border-gray-200" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-2xl">
            👤
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-800 truncate">{c.nome}</p>
          <p className="text-xs text-gray-500 mt-0.5">{c.cidade} · {c.estado}</p>
          <p className="text-xs text-gray-400 mt-0.5">CRECI: {c.creci}</p>
          <div className="mt-1.5">
            <CategoriaTag categoria={c.categoria} />
          </div>
        </div>
      </div>
      {c.especialidades.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {c.especialidades.slice(0, 3).map((e) => (
            <span key={e} className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
              {e}
            </span>
          ))}
          {c.especialidades.length > 3 && (
            <span className="text-xs text-gray-400 self-center">+{c.especialidades.length - 3}</span>
          )}
        </div>
      )}
      <div className="mt-auto px-4 pb-3 flex gap-3">
        {c.whatsapp && (
          <span className="text-xs text-green-600 font-medium">WhatsApp</span>
        )}
        {c.email && (
          <span className="text-xs text-blue-600 font-medium">E-mail</span>
        )}
      </div>
    </a>
  );
}

function FormCadastro({ onSuccess }: { onSuccess: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [form, setForm] = useState({
    nome: "", creci: "", categoria: "corretor_geral" as CategoriaCorretor,
    cidade: "", estado: "SP", bio: "",
    whatsapp: "", instagram: "", email: "", website: "", foto: "",
  });

  function toggleEsp(e: string) {
    setEspecialidades((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setErro("");
    setEnviando(true);
    const res = await fetch("/api/corretores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, especialidades }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) { setErro(data.error || "Erro ao enviar."); return; }
    onSuccess();
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome completo *</label>
          <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">CRECI *</label>
          <input required value={form.creci} onChange={(e) => setForm({ ...form, creci: e.target.value })}
            placeholder="Ex: 12345-F/SP"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Categoria *</label>
          <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaCorretor })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="credenciado_caixa">Credenciado Caixa</option>
            <option value="corretor_geral">Corretor Geral</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Estado *</label>
          <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Cidade *</label>
          <input required value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Mini bio</label>
          <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Conte um pouco sobre sua experiência com imóveis Caixa..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp</label>
          <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            placeholder="5511999999999"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Instagram</label>
          <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            placeholder="@seuperfil"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">E-mail profissional</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Site / Link profissional</label>
          <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">URL da foto de perfil</label>
          <input value={form.foto} onChange={(e) => setForm({ ...form, foto: e.target.value })}
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

      <button type="submit" disabled={enviando}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors">
        {enviando ? "Enviando..." : "Enviar cadastro"}
      </button>
      <p className="text-xs text-gray-400 text-center">
        Seu perfil será revisado e publicado em até 48h após aprovação.
      </p>
    </form>
  );
}

export default function CorretoresPage() {
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    fetch("/api/corretores/lista")
      .then((r) => r.json())
      .then((data) => { setCorretores(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const credenciados = corretores.filter(
    (c) => c.categoria === "credenciado_caixa" && (!filtroEstado || c.estado === filtroEstado)
  );
  const gerais = corretores.filter(
    (c) => c.categoria === "corretor_geral" && (!filtroEstado || c.estado === filtroEstado)
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <nav className="text-xs text-gray-400 mb-3">
          <a href="/" className="hover:underline">Início</a>
          <span className="mx-1">›</span>
          <span className="text-gray-600 font-medium">Corretores</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800">Corretores Credenciados</h1>
        <p className="text-gray-500 text-sm mt-1">
          Encontre especialistas em imóveis da Caixa Econômica Federal em todo o Brasil.
        </p>
      </div>

      {/* Banner CTA */}
      <div className="bg-brand-900 text-white rounded-xl shadow p-5 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="text-3xl">🏅</div>
          <div className="flex-1">
            <h2 className="font-bold mb-0.5">É corretor? Cadastre-se gratuitamente</h2>
            <p className="text-blue-200 text-sm">
              Apareça para milhares de compradores que buscam imóveis Caixa no seu estado.
            </p>
          </div>
          <button onClick={() => { setShowForm(true); window.scrollTo({ top: 9999, behavior: "smooth" }); }}
            className="shrink-0 bg-white text-brand-900 font-semibold px-5 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors">
            Quero me cadastrar
          </button>
        </div>
      </div>

      {/* Filtro por estado */}
      {corretores.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-gray-500">Filtrar por estado:</span>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos</option>
            {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-center py-16">Carregando corretores...</p>
      ) : corretores.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500 mb-8">
          <p className="text-4xl mb-3">👤</p>
          <p className="font-medium">Nenhum corretor cadastrado ainda.</p>
          <p className="text-sm text-gray-400 mt-1">Seja o primeiro a se cadastrar!</p>
        </div>
      ) : (
        <>
          {credenciados.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span className="text-blue-600">★</span> Credenciados Caixa
                <span className="text-sm font-normal text-gray-400">({credenciados.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {credenciados.map((c) => <CorretorCard key={c._id} c={c} />)}
              </div>
            </section>
          )}

          {gerais.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-bold text-gray-700 mb-4">
                Corretores Gerais
                <span className="text-sm font-normal text-gray-400 ml-2">({gerais.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gerais.map((c) => <CorretorCard key={c._id} c={c} />)}
              </div>
            </section>
          )}

          {credenciados.length === 0 && gerais.length === 0 && filtroEstado && (
            <p className="text-gray-400 text-center py-10">
              Nenhum corretor cadastrado em {filtroEstado} ainda.
            </p>
          )}
        </>
      )}

      {/* Formulário de cadastro */}
      <div id="cadastro" className="bg-white rounded-xl shadow p-6 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800 text-lg">Cadastre seu perfil</h2>
          {!showForm && (
            <button onClick={() => setShowForm(true)}
              className="text-sm text-blue-600 hover:underline">
              Abrir formulário
            </button>
          )}
        </div>

        {enviado ? (
          <div className="text-center py-6">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-semibold text-gray-700">Cadastro enviado com sucesso!</p>
            <p className="text-sm text-gray-500 mt-1">
              Seu perfil será revisado e publicado em até 48h.
            </p>
            <button onClick={() => { setEnviado(false); setShowForm(false); }}
              className="mt-4 text-sm text-blue-600 hover:underline">
              Enviar outro cadastro
            </button>
          </div>
        ) : showForm ? (
          <FormCadastro onSuccess={() => setEnviado(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-sm text-gray-500">
            {[
              { icon: "📋", title: "1. Cadastro", desc: "Preencha o formulário com seus dados profissionais." },
              { icon: "✅", title: "2. Validação", desc: "Verificamos seu CRECI e aprovamos em até 48h." },
              { icon: "📣", title: "3. Visibilidade", desc: "Seu perfil aparece para compradores no seu estado." },
            ].map((s) => (
              <div key={s.title} className="p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl mb-2">{s.icon}</div>
                <p className="font-semibold text-gray-700 text-sm mb-1">{s.title}</p>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
