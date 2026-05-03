import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlug, getPostsPublicados } from "@/lib/blog";
import { SITE_URL, SITE_NAME } from "@/lib/config";

export const revalidate = 60;

export async function generateStaticParams() {
  const posts = await getPostsPublicados();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.titulo,
    description: post.resumo,
    openGraph: {
      title: `${post.titulo} | ${SITE_NAME}`,
      description: post.resumo,
      url: `${SITE_URL}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.data,
      ...(post.imagem ? { images: [{ url: post.imagem }] } : {}),
    },
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
  };
}

function fmtData(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    // YouTube embed
    const ytMatch = line.match(/^\[youtube:([a-zA-Z0-9_-]+)\]$/);
    if (ytMatch) {
      return (
        <div key={i} className="my-6 aspect-video w-full rounded-xl overflow-hidden shadow">
          <iframe
            src={`https://www.youtube.com/embed/${ytMatch[1]}`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Vídeo do YouTube"
          />
        </div>
      );
    }
    if (line.startsWith("## "))
      return <h2 key={i} className="text-lg font-bold text-gray-800 mt-6 mb-2">{line.slice(3)}</h2>;
    if (line.startsWith("**") && line.endsWith("**"))
      return <p key={i} className="font-semibold text-gray-700 mt-3">{line.slice(2, -2)}</p>;
    if (line.startsWith("- "))
      return <li key={i} className="ml-5 list-disc text-gray-600 text-sm leading-relaxed">{line.slice(2)}</li>;
    if (/^\d+\./.test(line))
      return <li key={i} className="ml-5 list-decimal text-gray-600 text-sm leading-relaxed">{line.replace(/^\d+\.\s*/, "")}</li>;
    if (line === "---")
      return <hr key={i} className="my-5 border-gray-200" />;
    if (line.trim() === "")
      return <div key={i} className="h-3" />;
    return <p key={i} className="text-gray-600 text-sm leading-relaxed">{line}</p>;
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.titulo,
    description: post.resumo,
    datePublished: post.data,
    url: `${SITE_URL}/blog/${post.slug}`,
    ...(post.imagem ? { image: post.imagem } : {}),
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <div className="max-w-2xl mx-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />

      <nav className="text-xs text-gray-400 mb-6">
        <a href="/" className="hover:underline">Início</a>
        <span className="mx-1">›</span>
        <a href="/blog" className="hover:underline">Blog</a>
        <span className="mx-1">›</span>
        <span className="text-gray-600 font-medium">{post.titulo}</span>
      </nav>

      <article className="bg-white rounded-xl shadow overflow-hidden">
        {/* Imagem de capa apenas para posts sem vídeo */}
        {post.imagem && post.tipo !== "youtube" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.imagem} alt={post.titulo} className="w-full aspect-video object-cover" />
        )}

        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            {post.tipo === "youtube" && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">YouTube</span>
            )}
            <span className="text-xs text-gray-400">
              <time dateTime={post.data}>{fmtData(post.data)}</time>
              {" · "}{post.leitura} de leitura
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 leading-snug mb-6">{post.titulo}</h1>

          <div>{renderContent(post.conteudo)}</div>
        </div>
      </article>

      <div className="mt-8 pt-4 border-t">
        <a href="/blog" className="text-sm text-blue-600 hover:underline">← Ver todos os artigos</a>
      </div>
    </div>
  );
}
