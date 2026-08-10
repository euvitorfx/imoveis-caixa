"use client";

import { useEffect, useState } from "react";
import { Corretor, CategoriaCorretor } from "@/lib/corretores";
import { SITE_EMAIL } from "@/lib/config";

const ESTADOS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
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
        {c.whatsapp && <span className="text-xs text-green-600 font-medium">WhatsApp</span>}
        {c.email && <span className="text-xs text-blue-600 font-medium">E-mail</span>}
      </div>
    </a>
  );
}

export default function CorretoresPage() {
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");

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
        <h1 className="text-2xl font-bold text-gray-800">Corretores Parceiros</h1>
        <p className="text-gray-500 text-sm mt-1">
          Especialistas selecionados a dedo para ajudar você na compra de imóveis da Caixa Econômica Federal.
        </p>
      </div>

      {/* Listagem */}
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
          <p className="text-4xl mb-3">🏗️</p>
          <p className="font-medium">Em breve nossos primeiros parceiros.</p>
          <p className="text-sm text-gray-400 mt-1">Estamos selecionando especialistas para você.</p>
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
              Nenhum corretor parceiro em {filtroEstado} ainda.
            </p>
          )}
        </>
      )}

      {/* CTA Parceria */}
      <div className="text-white rounded-xl shadow p-6 mt-4" style={{ backgroundColor: "#0C4A6E", borderLeft: "4px solid #F59E0B" }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="text-3xl">🤝</div>
          <div className="flex-1">
            <h2 className="font-bold text-lg mb-1">Quer ser um corretor parceiro?</h2>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
              Nossos parceiros são selecionados individualmente. Se você é corretor especializado
              em imóveis da Caixa e quer aparecer para milhares de compradores, entre em contato
              para conhecer as condições de parceria.
            </p>
          </div>
          <a
            href={`mailto:${SITE_EMAIL}?subject=Quero%20ser%20corretor%20parceiro&body=Olá,%20sou%20corretor%20e%20gostaria%20de%20conhecer%20as%20condições%20de%20parceria%20para%20aparecer%20no%20Busca%20Leilões%20Caixa.%0A%0ANome:%0ACRECI:%0AEstado:%0ATelefone:`}
            className="shrink-0 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-opacity hover:opacity-90 whitespace-nowrap"
            style={{ backgroundColor: "#F59E0B", color: "#1C1917" }}>
            Entrar em contato
          </a>
        </div>
      </div>
    </div>
  );
}
