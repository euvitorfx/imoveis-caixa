import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import UltimaAtualizacao from "@/components/UltimaAtualizacao";
import ContadorVisitas from "@/components/ContadorVisitas";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import MetaPixel from "@/components/MetaPixel";
import RegistraVisita from "@/components/RegistraVisita";
import NavAuth from "@/components/NavAuth";
import NavAuthMobile from "@/components/NavAuthMobile";
import MobileNav from "@/components/MobileNav";
import Providers from "@/components/Providers";
import PopupFeaturesUsuario from "@/components/PopupFeaturesUsuario";
import { SITE_URL, SITE_NAME, SITE_EMAIL, SITE_WHATSAPP, SITE_INSTAGRAM, SITE_TIKTOK } from "@/lib/config";
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
        <PopupFeaturesUsuario />
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
            <MobileNav ultimaAtualizacao={<UltimaAtualizacao />} navAuth={<NavAuthMobile />} />

          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>

        <footer
          className="text-center text-xs py-6 mt-10"
          style={{ backgroundColor: "#01304D", borderTop: "3px solid #F59E0B", color: "rgba(255,255,255,0.60)" }}
        >
          {/* Redes sociais */}
          <div className="flex justify-center items-center gap-5 mb-3">
            <a href={SITE_INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:opacity-80 transition-opacity" style={{ color: "rgba(255,255,255,0.75)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
            <a href={SITE_TIKTOK} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="hover:opacity-80 transition-opacity" style={{ color: "rgba(255,255,255,0.75)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.69a4.85 4.85 0 01-1-.01z"/>
              </svg>
            </a>
            <a href={`https://wa.me/${SITE_WHATSAPP}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="hover:opacity-80 transition-opacity" style={{ color: "rgba(255,255,255,0.75)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          </div>
          <p>Dados obtidos diariamente do site oficial da Caixa Econômica Federal. Não somos afiliados à Caixa.</p>
          <p className="mt-1">
            Contato:{" "}
            <a href={`mailto:${SITE_EMAIL}`} className="hover:opacity-80 transition-opacity" style={{ color: "#F59E0B" }}>
              {SITE_EMAIL}
            </a>
          </p>
          <ContadorVisitas />
        </footer>

        {/* Botão flutuante WhatsApp */}
        <a
          href={`https://wa.me/${SITE_WHATSAPP}?text=${encodeURIComponent("Olá! Preciso de suporte no Busca Leilões Caixa.")}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Suporte via WhatsApp"
          className="fixed bottom-6 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-xl hover:scale-110 transition-transform"
          style={{ backgroundColor: "#25D366" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="30" height="30">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
        </Providers>
      </body>
    </html>
  );
}
