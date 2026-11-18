import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Chromium e Puppeteer contêm binários nativos que o webpack não consegue bundlar
  serverExternalPackages: ["@sparticuz/chromium-min", "puppeteer-core"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "venda-imoveis.caixa.gov.br",
      },
    ],
  },
};

export default nextConfig;
