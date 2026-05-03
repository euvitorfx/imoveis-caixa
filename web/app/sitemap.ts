import { MetadataRoute } from "next";
import clientPromise from "@/lib/mongodb";
import { SITE_URL } from "@/lib/config";
import { getPostsPublicados } from "@/lib/blog";
import { getCorretoresAprovados } from "@/lib/corretores";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL,                        changeFrequency: "hourly",  priority: 1.0 },
    { url: `${SITE_URL}/mapa`,              changeFrequency: "daily",   priority: 0.8 },
    { url: `${SITE_URL}/estatisticas`,      changeFrequency: "daily",   priority: 0.7 },
    { url: `${SITE_URL}/ferramentas`,       changeFrequency: "weekly",  priority: 0.7 },
    { url: `${SITE_URL}/blog`,              changeFrequency: "daily",   priority: 0.8 },
    { url: `${SITE_URL}/corretores`,        changeFrequency: "weekly",  priority: 0.7 },
    { url: `${SITE_URL}/favoritos`,         changeFrequency: "never",   priority: 0.3 },
  ];

  try {
    const client = await clientPromise;
    const col = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);

    const [imovelDocs, posts, corretores] = await Promise.all([
      col.find({ ativo: true }).project({ hdnImovel: 1, dataAtualizacao: 1 }).toArray(),
      getPostsPublicados(),
      getCorretoresAprovados(),
    ]);

    const imovelPages: MetadataRoute.Sitemap = imovelDocs.map((doc) => ({
      url:              `${SITE_URL}/imovel/${doc.hdnImovel}`,
      lastModified:     doc.dataAtualizacao ?? new Date(),
      changeFrequency:  "weekly" as const,
      priority:         0.6,
    }));

    const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
      url:              `${SITE_URL}/blog/${post.slug}`,
      lastModified:     new Date(post.data),
      changeFrequency:  "monthly" as const,
      priority:         0.6,
    }));

    const corretorPages: MetadataRoute.Sitemap = corretores.map((c) => ({
      url:              `${SITE_URL}/corretores/${c.slug}`,
      lastModified:     new Date(c.criadoEm),
      changeFrequency:  "monthly" as const,
      priority:         0.5,
    }));

    return [...staticPages, ...imovelPages, ...blogPages, ...corretorPages];
  } catch {
    return staticPages;
  }
}
