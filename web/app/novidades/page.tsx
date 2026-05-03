import { Metadata } from "next";
import { SITE_NAME } from "@/lib/config";
import { POSTS } from "./posts";

export const metadata: Metadata = {
  title: "Novidades e Dicas sobre Leilões de Imóveis Caixa",
  description: "Artigos, dicas e novidades sobre como comprar imóveis da Caixa Econômica Federal em leilões e vendas diretas. Aprenda a arrematar com segurança.",
};

function fmtData(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function NovidadesPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Novidades e Dicas</h1>
        <p className="text-gray-500 text-sm mt-1">
          Artigos sobre leilões e imóveis da Caixa Econômica Federal — {SITE_NAME}.
        </p>
      </div>

      <div className="space-y-6">
        {POSTS.map((post) => (
          <article
            key={post.slug}
            className="bg-white rounded-xl shadow p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
              <time dateTime={post.data}>{fmtData(post.data)}</time>
              <span>·</span>
              <span>{post.leitura} de leitura</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2 leading-snug">
              <a href={`/novidades/${post.slug}`} className="hover:text-blue-600 transition-colors">
                {post.titulo}
              </a>
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">{post.resumo}</p>
            <a
              href={`/novidades/${post.slug}`}
              className="inline-block mt-3 text-sm text-blue-600 hover:underline font-medium"
            >
              Ler artigo →
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
