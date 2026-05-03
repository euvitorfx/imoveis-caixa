import { Metadata } from "next";
import { notFound } from "next/navigation";
import { POSTS, getPost } from "../posts";
import { SITE_URL, SITE_NAME } from "@/lib/config";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.titulo,
    description: post.resumo,
    openGraph: {
      title: `${post.titulo} | ${SITE_NAME}`,
      description: post.resumo,
      url: `${SITE_URL}/novidades/${post.slug}`,
      type: "article",
      publishedTime: post.data,
    },
    alternates: { canonical: `${SITE_URL}/novidades/${post.slug}` },
  };
}

function renderMarkdown(md: string) {
  return md.split("\n").map((line, i) => {
    if (line.startsWith("## ")) {
      return <h2 key={i} className="text-lg font-bold text-gray-800 mt-6 mb-2">{line.slice(3)}</h2>;
    }
    if (line.startsWith("**") && line.endsWith("**")) {
      return <p key={i} className="font-semibold text-gray-700 mt-3">{line.slice(2, -2)}</p>;
    }
    if (line.startsWith("- ")) {
      return <li key={i} className="ml-4 list-disc text-gray-600 text-sm">{line.slice(2)}</li>;
    }
    if (/^\d+\./.test(line)) {
      return <li key={i} className="ml-4 list-decimal text-gray-600 text-sm">{line.replace(/^\d+\.\s*/, "")}</li>;
    }
    if (line === "---") {
      return <hr key={i} className="my-4 border-gray-200" />;
    }
    if (line.trim() === "") {
      return <div key={i} className="h-2" />;
    }
    return <p key={i} className="text-gray-600 text-sm leading-relaxed">{line}</p>;
  });
}

function fmtData(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.titulo,
    description: post.resumo,
    datePublished: post.data,
    url: `${SITE_URL}/novidades/${post.slug}`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início",    item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Novidades", item: `${SITE_URL}/novidades` },
      { "@type": "ListItem", position: 3, name: post.titulo },
    ],
  };

  return (
    <div className="max-w-2xl mx-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <nav className="text-xs text-gray-400 mb-6">
        <a href="/" className="hover:underline">Início</a>
        <span className="mx-1">›</span>
        <a href="/novidades" className="hover:underline">Novidades</a>
        <span className="mx-1">›</span>
        <span className="text-gray-600 font-medium line-clamp-1">{post.titulo}</span>
      </nav>

      <article className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          <time dateTime={post.data}>{fmtData(post.data)}</time>
          <span>·</span>
          <span>{post.leitura} de leitura</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 leading-snug mb-6">{post.titulo}</h1>

        <div className="prose-sm">{renderMarkdown(post.conteudo)}</div>
      </article>

      <div className="mt-8 pt-4 border-t">
        <a href="/novidades" className="text-sm text-blue-600 hover:underline">
          ← Ver todos os artigos
        </a>
      </div>
    </div>
  );
}
