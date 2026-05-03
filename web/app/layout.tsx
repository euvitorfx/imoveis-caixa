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
        <header className="text-white shadow-md" style={{ backgroundColor: "#01112c", minHeight: "150px" }}>
          <div className="max-w-7xl mx-auto px-4 h-full flex flex-col justify-center gap-3" style={{ minHeight: "150px" }}>
            <div className="flex items-center justify-between">
              <a href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="IO Leilões — Buscador de Imóveis da Caixa" className="h-20 w-auto object-contain" />
              </a>
              <div className="flex flex-col items-end gap-2">
                <UltimaAtualizacao />
                <nav className="text-sm text-blue-200 hidden sm:flex gap-4">
                  <a href="/" className="hover:text-white transition-colors">Buscar</a>
                  <a href="/mapa" className="hover:text-white transition-colors">Mapa</a>
                  <a href="/estatisticas" className="hover:text-white transition-colors">Estatísticas</a>
                  <a href="/corretores" className="hover:text-white transition-colors">Corretores</a>
                </nav>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
        <footer className="text-center text-xs text-gray-400 py-6 mt-10 border-t">
          <p>Dados obtidos diariamente do site oficial da Caixa Econômica Federal. Não somos afiliados à Caixa.</p>
          <ContadorVisitas />
        </footer>
      </body>
    </html>
  );
}
