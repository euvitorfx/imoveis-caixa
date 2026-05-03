import type { Metadata } from "next";
import { Inter } from "next/font/google";
import UltimaAtualizacao from "@/components/UltimaAtualizacao";
import ContadorVisitas from "@/components/ContadorVisitas";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { SITE_URL, SITE_NAME, SITE_EMAIL } from "@/lib/config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — Leilões e Vendas da Caixa`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Encontre imóveis da Caixa Econômica Federal em todo o Brasil. Leilões, vendas online e venda direta com os melhores filtros. Atualizado diariamente.",
  keywords: [
    "imóveis caixa", "leilão caixa", "venda online caixa",
    "imóveis baratos", "leilão de imóveis", "caixa econômica federal",
    "arrematação imóvel", "busca leilões caixa",
  ],
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.png",    sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png",   sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    siteName: SITE_NAME,
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/logo.png", width: 300, height: 125, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <GoogleAnalytics />

        <header className="text-white shadow-md" style={{ backgroundColor: "#01112c" }}>
          <div className="max-w-7xl mx-auto px-4 pt-3 pb-2">

            {/* Desktop: logo esquerda + nav/atualização direita */}
            <div className="hidden sm:flex items-center justify-between">
              <a href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt={SITE_NAME} className="w-auto object-contain" style={{ height: "90px" }} />
              </a>
              <div className="flex flex-col items-end gap-2">
                <UltimaAtualizacao />
                <nav className="text-sm text-blue-200 flex gap-4">
                  <a href="/" className="hover:text-white transition-colors">Buscar</a>
                  <a href="/mapa" className="hover:text-white transition-colors">Mapa</a>
                  <a href="/estatisticas" className="hover:text-white transition-colors">Estatísticas</a>
                  <a href="/corretores" className="hover:text-white transition-colors">Corretores</a>
                  <a href="/ferramentas" className="hover:text-white transition-colors">Ferramentas</a>
                  <a href="/blog" className="hover:text-white transition-colors">Blog</a>
                  <a href="/favoritos" className="hover:text-white transition-colors flex items-center gap-1">
                    <span className="text-red-400">♥</span> Favoritos
                  </a>
                </nav>
              </div>
            </div>

            {/* Mobile: logo centralizada + atualização + nav */}
            <div className="sm:hidden flex flex-col items-center gap-2">
              <a href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt={SITE_NAME} className="w-auto object-contain" style={{ height: "90px" }} />
              </a>
              <UltimaAtualizacao />
              <nav className="flex w-full overflow-x-auto text-xs text-blue-200 border-t border-blue-900 pt-2 pb-1 gap-4 px-1 scrollbar-none">
                <a href="/" className="hover:text-white transition-colors py-1 shrink-0">Buscar</a>
                <a href="/mapa" className="hover:text-white transition-colors py-1 shrink-0">Mapa</a>
                <a href="/estatisticas" className="hover:text-white transition-colors py-1 shrink-0">Estatísticas</a>
                <a href="/corretores" className="hover:text-white transition-colors py-1 shrink-0">Corretores</a>
                <a href="/ferramentas" className="hover:text-white transition-colors py-1 shrink-0">Ferramentas</a>
                <a href="/blog" className="hover:text-white transition-colors py-1 shrink-0">Blog</a>
                <a href="/favoritos" className="hover:text-white transition-colors py-1 shrink-0 text-red-400">♥</a>
              </nav>
            </div>

          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>

        <footer className="text-center text-xs text-white py-6 mt-10" style={{ backgroundColor: "#01112c" }}>
          <p>Dados obtidos diariamente do site oficial da Caixa Econômica Federal. Não somos afiliados à Caixa.</p>
          <p className="mt-1">
            Contato:{" "}
            <a href={`mailto:${SITE_EMAIL}`} className="text-blue-300 hover:text-white transition-colors">
              {SITE_EMAIL}
            </a>
          </p>
          <ContadorVisitas />
        </footer>
      </body>
    </html>
  );
}
