import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import UltimaAtualizacao from "@/components/UltimaAtualizacao";
import ContadorVisitas from "@/components/ContadorVisitas";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import MetaPixel from "@/components/MetaPixel";
import RegistraVisita from "@/components/RegistraVisita";
import NavAuth from "@/components/NavAuth";
import MobileNav from "@/components/MobileNav";
import Providers from "@/components/Providers";
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
        <Providers>
        <RegistraVisita />
        <GoogleAnalytics />
        <MetaPixel />
        <Analytics />

        <header
          className="shadow-sm"
          style={{ backgroundColor: "#01304D", borderBottom: "3px solid #F59E0B" }}
        >
          <div className="max-w-7xl mx-auto px-4 pt-3 pb-2">

            {/* Desktop: logo esquerda + nav/atualização direita */}
            <div className="hidden sm:flex items-center justify-between">
              <a href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt={SITE_NAME} className="w-auto object-contain" style={{ height: "100px" }} />
              </a>
              <div className="flex flex-col items-end gap-2">
                <UltimaAtualizacao />
                <nav className="text-sm flex items-center gap-4" style={{ color: "rgba(255,255,255,0.75)" }}>
                  <a href="/" className="hover:text-white transition-colors">Buscar</a>
                  <a href="/mapa" className="hover:text-white transition-colors">Mapa</a>
                  <a href="/estatisticas" className="hover:text-white transition-colors">Estatísticas</a>
                  <a href="/corretores" className="hover:text-white transition-colors">Corretores</a>
                  <a href="/ferramentas" className="hover:text-white transition-colors">Ferramentas</a>
                  <a href="/blog" className="hover:text-white transition-colors">Blog</a>
                  <a href="/favoritos" className="hover:text-white transition-colors flex items-center gap-1">
                    <span style={{ color: "#F59E0B" }}>♥</span> Favoritos
                  </a>
                  <a
                    href="/clube"
                    className="font-bold hover:opacity-90 transition-opacity px-3 py-1 rounded-full"
                    style={{ backgroundColor: "#F59E0B", color: "#1C1917" }}
                  >
                    Clube BLC
                  </a>
                  <NavAuth />
                </nav>
              </div>
            </div>

            {/* Mobile: hamburger menu */}
            <MobileNav ultimaAtualizacao={<UltimaAtualizacao />} navAuth={<NavAuth />} />

          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>

        <footer
          className="text-center text-xs py-6 mt-10"
          style={{ backgroundColor: "#01304D", borderTop: "3px solid #F59E0B", color: "rgba(255,255,255,0.60)" }}
        >
          <p>Dados obtidos diariamente do site oficial da Caixa Econômica Federal. Não somos afiliados à Caixa.</p>
          <p className="mt-1">
            Contato:{" "}
            <a href={`mailto:${SITE_EMAIL}`} className="hover:opacity-80 transition-opacity" style={{ color: "#F59E0B" }}>
              {SITE_EMAIL}
            </a>
          </p>
          <ContadorVisitas />
        </footer>
        </Providers>
      </body>
    </html>
  );
}
