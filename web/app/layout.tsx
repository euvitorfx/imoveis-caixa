import type { Metadata } from "next";
import { Inter } from "next/font/google";
import UltimaAtualizacao from "@/components/UltimaAtualizacao";
import ContadorVisitas from "@/components/ContadorVisitas";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Buscador de Imóveis Caixa - Canal Invista em Leilões",
  description: "Encontre imóveis da Caixa Econômica Federal em todo o Brasil. Leilões, vendas online e venda direta com os melhores filtros.",
  keywords: ["imóveis caixa", "leilão caixa", "venda online caixa", "imóveis baratos", "invista em leilões"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <header className="text-white shadow-md" style={{ backgroundColor: "#01112c" }}>
          <div className="max-w-7xl mx-auto px-4 pt-3 pb-2">

            {/* Desktop: logo esquerda + nav/atualização direita */}
            <div className="hidden sm:flex items-center justify-between">
              <a href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="IO Leilões — Buscador de Imóveis da Caixa" className="w-auto object-contain" style={{ height: "90px" }} />
              </a>
              <div className="flex flex-col items-end gap-2">
                <UltimaAtualizacao />
                <nav className="text-sm text-blue-200 flex gap-4">
                  <a href="/" className="hover:text-white transition-colors">Buscar</a>
                  <a href="/mapa" className="hover:text-white transition-colors">Mapa</a>
                  <a href="/estatisticas" className="hover:text-white transition-colors">Estatísticas</a>
                  <a href="/corretores" className="hover:text-white transition-colors">Corretores</a>
                </nav>
              </div>
            </div>

            {/* Mobile: logo centralizada + atualização + nav */}
            <div className="sm:hidden flex flex-col items-center gap-2">
              <a href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="IO Leilões — Buscador de Imóveis da Caixa" className="w-auto object-contain" style={{ height: "90px" }} />
              </a>
              <UltimaAtualizacao />
              <nav className="flex justify-around w-full text-xs text-blue-200 border-t border-blue-900 pt-2 pb-1">
                <a href="/" className="hover:text-white transition-colors py-1">Buscar</a>
                <a href="/mapa" className="hover:text-white transition-colors py-1">Mapa</a>
                <a href="/estatisticas" className="hover:text-white transition-colors py-1">Estatísticas</a>
                <a href="/corretores" className="hover:text-white transition-colors py-1">Corretores</a>
              </nav>
            </div>

          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
        <footer className="text-center text-xs text-white py-6 mt-10" style={{ backgroundColor: "#01112c" }}>
          <p>Dados obtidos diariamente do site oficial da Caixa Econômica Federal. Não somos afiliados à Caixa.</p>
          <ContadorVisitas />
        </footer>
      </body>
    </html>
  );
}
