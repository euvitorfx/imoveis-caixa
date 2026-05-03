import { MetadataRoute } from "next";
import clientPromise from "@/lib/mongodb";
import { SITE_URL } from "@/lib/config";

export const revalidate = 3600; // regenera o sitemap a cada 1h

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/mapa`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/estatisticas`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/ferramentas`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/corretores`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  try {
    const client = await clientPromise;
    const col = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);

    const docs = await col
      .find({ ativo: true })
      .project({ hdnImovel: 1, dataAtualizacao: 1 })
      .toArray();

    const imovelPages: MetadataRoute.Sitemap = docs.map((doc) => ({
      url: `${SITE_URL}/imovel/${doc.hdnImovel}`,
      lastModified: doc.dataAtualizacao ?? new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [...staticPages, ...imovelPages];
  } catch {
    return staticPages;
  }
}
