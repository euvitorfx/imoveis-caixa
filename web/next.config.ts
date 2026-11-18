import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
