import { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { getPostsPublicados, seedIfEmpty } from "@/lib/blog";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog — Dicas e Novidades sobre Leilões de Imóveis",
  description: "Artigos, dicas e novidades sobre como comprar imóveis da Caixa Econômica Federal em leilões e vendas diretas.",
  alternates: { canonical: `${SITE_URL}/blog` },
};

function fmtData(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function BlogPage() {
  await seedIfEmpty();
  const posts = await getPostsPublicados();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Blog</h1>
        <p className="text-gray-500 text-sm mt-1">
          Dicas, novidades e vídeos sobre leilões de imóveis — {SITE_NAME}.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-400 text-center py-20">Nenhum post publicado ainda.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {posts.map((post) => (
            <article key={post._id} className="bg-white rounded-xl shadow hover:shadow-md transition-shadow overflow-hidden flex flex-col">

              {/* Imagem de capa — proporção 16:9 */}
              <div className="w-full aspect-video overflow-hidden">
                {post.imagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.imagem}
                    alt={post.titulo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl"
                    style={{ background: "linear-gradient(135deg, #01112c 0%, #1e3a5f 100%)" }}>
                    {post.tipo === "youtube" ? "▶" : "📰"}
                  </div>
                )}
              </div>

              <div className="p-5 flex flex-col flex-1">
                {/* Tags */}
                <div className="flex items-center gap-2 mb-2">
                  {post.tipo === "youtube" && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">YouTube</span>
                  )}
                  <span className="text-xs text-gray-400">
                    <time dateTime={post.data}>{fmtData(post.data)}</time>
                    {" · "}{post.leitura} de leitura
                  </span>
                </div>

                <h2 className="text-base font-semibold text-gray-800 mb-2 leading-snug flex-1">
                  <a href={`/blog/${post.slug}`} className="hover:text-blue-600 transition-colors">
                    {post.titulo}
                  </a>
                </h2>

                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-4">{post.resumo}</p>

                <a href={`/blog/${post.slug}`}
                  className="text-sm text-blue-600 hover:underline font-medium mt-auto">
                  Ler artigo →
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
