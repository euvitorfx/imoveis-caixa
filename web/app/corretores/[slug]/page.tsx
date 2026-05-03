import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCorretorBySlug, getCorretoresAprovados } from "@/lib/corretores";
import { SITE_URL, SITE_NAME } from "@/lib/config";

export const revalidate = 60;

export async function generateStaticParams() {
  const corretores = await getCorretoresAprovados();
  return corretores.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCorretorBySlug(slug);
  if (!c) return {};
  return {
    title: `${c.nome} — Corretor | ${SITE_NAME}`,
    description: c.bio || `${c.nome}, corretor imobiliário em ${c.cidade}/${c.estado}. CRECI: ${c.creci}.`,
    openGraph: {
      title: `${c.nome} | ${SITE_NAME}`,
      description: c.bio || `Corretor em ${c.cidade}/${c.estado}`,
      url: `${SITE_URL}/corretores/${c.slug}`,
      ...(c.foto ? { images: [{ url: c.foto }] } : {}),
    },
    alternates: { canonical: `${SITE_URL}/corretores/${c.slug}` },
  };
}

export default async function CorretorPerfilPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const c = await getCorretorBySlug(slug);
  if (!c) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: c.nome,
    jobTitle: c.categoria === "credenciado_caixa" ? "Corretor Credenciado Caixa" : "Corretor de Imóveis",
    description: c.bio,
    address: { "@type": "PostalAddress", addressLocality: c.cidade, addressRegion: c.estado, addressCountry: "BR" },
    ...(c.foto ? { image: c.foto } : {}),
    ...(c.email ? { email: c.email } : {}),
    ...(c.website ? { url: c.website } : {}),
  };

  return (
    <div className="max-w-2xl mx-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-xs text-gray-400 mb-6">
        <a href="/" className="hover:underline">Início</a>
        <span className="mx-1">›</span>
        <a href="/corretores" className="hover:underline">Corretores</a>
        <span className="mx-1">›</span>
        <span className="text-gray-600 font-medium">{c.nome}</span>
      </nav>

      {/* Card principal */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex items-start gap-5">
          {c.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.foto} alt={c.nome}
              className="w-24 h-24 rounded-full object-cover shrink-0 border-2 border-gray-200" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-4xl border-2 border-gray-200">
              👤
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-800">{c.nome}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{c.cidade} · {c.estado}</p>
            <p className="text-xs text-gray-400 mt-0.5">CRECI: {c.creci}</p>
            <div className="mt-2">
              {c.categoria === "credenciado_caixa" ? (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  ★ Credenciado Caixa
                </span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                  Corretor Geral
                </span>
              )}
            </div>
          </div>
        </div>

        {c.bio && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600 leading-relaxed">{c.bio}</p>
          </div>
        )}

        {c.especialidades.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Especialidades</p>
            <div className="flex flex-wrap gap-2">
              {c.especialidades.map((e) => (
                <span key={e}
                  className="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1 rounded-full">
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Botões de contato */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Entrar em contato</h2>
        <div className="flex flex-col gap-3">
          {c.whatsapp && (
            <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}?text=Olá%20${encodeURIComponent(c.nome)},%20te%20encontrei%20no%20Busca%20Leilões%20Caixa%20e%20gostaria%20de%20saber%20mais%20sobre%20os%20imóveis%20disponíveis.`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-3 rounded-lg transition-colors">
              <span className="text-xl">💬</span>
              <span>Chamar no WhatsApp</span>
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}?subject=Interesse%20em%20imóveis%20Caixa&body=Olá%20${encodeURIComponent(c.nome)},%20te%20encontrei%20no%20Busca%20Leilões%20Caixa%20e%20gostaria%20de%20mais%20informações.`}
              className="flex items-center gap-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-5 py-3 rounded-lg transition-colors border border-blue-200">
              <span className="text-xl">✉️</span>
              <span>{c.email}</span>
            </a>
          )}
          {c.instagram && (
            <a href={`https://instagram.com/${c.instagram.replace("@", "")}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-pink-50 hover:bg-pink-100 text-pink-700 font-medium px-5 py-3 rounded-lg transition-colors border border-pink-200">
              <span className="text-xl">📷</span>
              <span>{c.instagram.startsWith("@") ? c.instagram : `@${c.instagram}`}</span>
            </a>
          )}
          {c.website && (
            <a href={c.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium px-5 py-3 rounded-lg transition-colors border border-gray-200">
              <span className="text-xl">🌐</span>
              <span className="truncate">{c.website}</span>
            </a>
          )}
          {!c.whatsapp && !c.email && !c.instagram && !c.website && (
            <p className="text-sm text-gray-400 text-center py-2">Nenhum contato disponível.</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <a href="/corretores" className="text-sm text-blue-600 hover:underline">← Ver todos os corretores</a>
      </div>
    </div>
  );
}
