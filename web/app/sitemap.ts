import { MetadataRoute } from "next";
import clientPromise from "@/lib/mongodb";
import { SITE_URL } from "@/lib/config";
import { getPostsPublicados } from "@/lib/blog";
import { getCorretoresAprovados } from "@/lib/corretores";
import { ALL_ESTADOS, slugify } from "@/lib/utils";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL,                        changeFrequency: "hourly",  priority: 1.0 },
    { url: `${SITE_URL}/mapa`,              changeFrequency: "daily",   priority: 0.8 },
    { url: `${SITE_URL}/estatisticas`,      changeFrequency: "daily",   priority: 0.7 },
    { url: `${SITE_URL}/ferramentas`,       changeFrequency: "weekly",  priority: 0.7 },
    { url: `${SITE_URL}/blog`,              changeFrequency: "daily",   priority: 0.8 },
    { url: `${SITE_URL}/corretores`,        changeFrequency: "weekly",  priority: 0.7 },
    { url: `${SITE_URL}/favoritos`,         changeFrequency: "never",   priority: 0.3 },
    { url: `${SITE_URL}/clube`,            changeFrequency: "monthly", priority: 0.7 },
  ];

  try {
    const client = await clientPromise;
    const col = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);

    const [imovelDocs, posts, corretores, cidadesPorEstado] = await Promise.all([
      col.find({ ativo: true }).project({ hdnImovel: 1, dataAtualizacao: 1, descricaoGeradaEm: 1 }).toArray(),
      getPostsPublicados(),
      getCorretoresAprovados(),
      Promise.all(
        ALL_ESTADOS.map(async (uf) => {
          const cidades = await col.distinct("cidade", { estado: uf, ativo: true }) as string[];
          return { uf, cidades };
        })
      ),
    ]);

    const imovelPages: MetadataRoute.Sitemap = imovelDocs.map((doc) => {
      // Usa a data mais recente entre atualização de dados e geração de descrição IA
      const dates = [doc.dataAtualizacao, doc.descricaoGeradaEm].filter(Boolean);
      const lastModified = dates.length
        ? new Date(Math.max(...dates.map((d: Date) => new Date(d).getTime())))
        : new Date();
      return {
        url:             `${SITE_URL}/imovel/${doc.hdnImovel}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority:        0.6,
      };
    });

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

    const estadoPages: MetadataRoute.Sitemap = ALL_ESTADOS.map((uf) => ({
      url:             `${SITE_URL}/imoveis/${uf.toLowerCase()}`,
      changeFrequency: "daily" as const,
      priority:        0.8,
    }));

    const cidadePages: MetadataRoute.Sitemap = cidadesPorEstado.flatMap(({ uf, cidades }) =>
      cidades.map((cidade) => ({
        url:             `${SITE_URL}/imoveis/${uf.toLowerCase()}/${slugify(cidade)}`,
        changeFrequency: "daily" as const,
        priority:        0.7,
      }))
    );

    return [...staticPages, ...estadoPages, ...cidadePages, ...imovelPages, ...blogPages, ...corretorPages];
  } catch {
    return staticPages;
  }
}
