import type { Metadata } from "next";
import { Inter } from "next/font/google";
import UltimaAtualizacao from "@/components/UltimaAtualizacao";
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
        <header className="bg-brand-900 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-bold text-xl">
              <span className="text-blue-300">🏠</span>
              <span className="leading-tight">Buscador de Imóveis Caixa<span className="hidden sm:inline"> - Canal Invista em Leilões</span></span>
            </a>
            <div className="flex items-center gap-6">
              <UltimaAtualizacao />
              <nav className="text-sm text-blue-200 hidden sm:flex gap-4">
                <a href="/" className="hover:text-white transition-colors">Buscar</a>
                <a href="/mapa" className="hover:text-white transition-colors">Mapa</a>
                <a href="/estatisticas" className="hover:text-white transition-colors">Estatísticas</a>
                <a href="/corretores" className="hover:text-white transition-colors">Corretores</a>
              </nav>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
        <footer className="text-center text-xs text-gray-400 py-6 mt-10 border-t">
          Dados obtidos diariamente do site oficial da Caixa Econômica Federal. Não somos afiliados à Caixa.
        </footer>
      </body>
    </html>
  );
}
