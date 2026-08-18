import { notFound } from "next/navigation";
import { Metadata } from "next";
import clientPromise from "@/lib/mongodb";
import { Imovel } from "@/lib/types";
import { ObjectId } from "mongodb";
import DetalheClient from "@/components/DetalheClient";
import { SITE_URL, SITE_NAME, SITE_EMAIL, SITE_WHATSAPP } from "@/lib/config";
import { getCorretoresAprovados, Corretor } from "@/lib/corretores";

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-gray-100 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700">
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function InfoGroup({ title, items }: { title: string; items: [string, string][] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{title}</h3>
      <div className="space-y-1.5">
        {items.map(([label, val]) => (
          <div key={label} className="flex justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
            <span className="text-gray-500 shrink-0">{label}</span>
            <span className="font-medium text-gray-800 text-right ml-2">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type SimilarImovel = {
  hdnImovel: string;
  preco: number | null;
  precoAval: number | null;
  tipo?: string;
  cidade: string;
  estado: string;
  areaTotal?: number;
  quartos?: number;
  fotoUrl?: string;
};

async function getImovel(id: string): Promise<Imovel | null> {
  try {
    const client = await clientPromise;
    const col    = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);
    let doc = await col.findOne({ hdnImovel: id });
    if (!doc && ObjectId.isValid(id)) {
      doc = await col.findOne({ _id: new ObjectId(id) });
    }
    if (!doc) return null;
    return { ...doc, _id: doc._id.toString() } as Imovel;
  } catch {
    return null;
  }
}

async function getMediaPrecoPorM2(estado: string, tipo?: string): Promise<number | null> {
  try {
    const client = await clientPromise;
    const col    = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);
    const result = await col.aggregate([
      { $match: { ativo: true, estado, ...(tipo ? { tipo } : {}), preco: { $gt: 0 }, areaTotal: { $gt: 0 } } },
      { $project: { _id: 0, ppm2: { $divide: ["$preco", "$areaTotal"] } } },
      { $group: { _id: null, media: { $avg: "$ppm2" } } },
    ]).toArray();
    return result[0]?.media ? Math.round(result[0].media) : null;
  } catch {
    return null;
  }
}

async function getImovelSimilares(imovel: Imovel): Promise<SimilarImovel[]> {
  if (!imovel.preco || !imovel.cidade) return [];
  try {
    const client = await clientPromise;
    const col    = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);
    const docs   = await col.find(
      {
        ativo: true,
        hdnImovel: { $ne: imovel.hdnImovel },
        cidade: imovel.cidade,
        ...(imovel.tipo ? { tipo: imovel.tipo } : {}),
        preco: { $gte: imovel.preco * 0.5, $lte: imovel.preco * 1.5 },
      },
      {
        projection: {
          _id: 0, hdnImovel: 1, preco: 1, precoAval: 1, tipo: 1,
          cidade: 1, estado: 1, areaTotal: 1, quartos: 1, fotoUrl: 1,
        }
      }
    ).limit(3).toArray();
    return docs as unknown as SimilarImovel[];
  } catch {
    return [];
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const imovel = await getImovel(id);
  if (!imovel) return {};

  const titulo  = `${imovel.tipo || "Imóvel"} em ${imovel.cidade}/${imovel.estado}`;
  const preco   = imovel.preco
    ? imovel.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
    : null;
  // Usa descrição IA se disponível (mais rica para SEO); fallback estruturado
  const descFallback = [
    titulo,
    preco ? `por ${preco}` : null,
    imovel.modalidade || null,
    imovel.areaTotal ? `${imovel.areaTotal}m²` : null,
    imovel.quartos   ? `${imovel.quartos} quartos` : null,
    `Imóvel da Caixa Econômica Federal.`,
  ].filter(Boolean).join(" · ");

  const descIA      = imovel.descricao
    ? imovel.descricao.split("\n\n")[0].trim()
    : null;
  const desc        = descIA
    ? (descIA.length > 155 ? descIA.slice(0, 152) + "…" : descIA)
    : descFallback;

  const pageUrl = `${SITE_URL}/imovel/${imovel.hdnImovel}`;
  const image   = imovel.fotoUrl ?? `${SITE_URL}/logo.png`;

  return {
    title: `${titulo}${preco ? ` — ${preco}` : ""} | ${SITE_NAME}`,
    description: desc,
    openGraph: {
      title: `${titulo}${preco ? ` — ${preco}` : ""}`,
      description: desc,
      url: pageUrl,
      siteName: SITE_NAME,
      images: [{ url: image, width: 800, height: 600, alt: titulo }],
      type: "website",
      locale: "pt_BR",
    },
    twitter: {
      card: "summary_large_image",
      title: `${titulo}${preco ? ` — ${preco}` : ""}`,
      description: desc,
      images: [image],
    },
    alternates: { canonical: pageUrl },
  };
}

export default async function DetalheImovel({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ volta?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  // Aceita apenas caminhos internos para evitar open redirect
  const volta = sp.volta?.match(/^\/imoveis\/[a-z]{2}(\/[a-z0-9-]+)?$/) ? sp.volta : null;

  const [imovel, todosCorretores] = await Promise.all([
    getImovel(id),
    getCorretoresAprovados(),
  ]);
  if (!imovel) notFound();

  const [similares, mediaEstadoM2] = await Promise.all([
    getImovelSimilares(imovel),
    (imovel.preco && imovel.areaTotal && imovel.areaTotal > 0)
      ? getMediaPrecoPorM2(imovel.estado, imovel.tipo)
      : Promise.resolve(null),
  ]);

  const corretoresEstado = todosCorretores
    .filter((c) => c.estado === imovel.estado)
    .slice(0, 3);

  const descPct = imovel.precoAval && imovel.preco
    ? Math.round((1 - imovel.preco / imovel.precoAval) * 100)
    : null;

  const economia = imovel.precoAval && imovel.preco && imovel.precoAval > imovel.preco
    ? imovel.precoAval - imovel.preco
    : null;

  const precoPorM2 = imovel.areaTotal && imovel.preco && imovel.areaTotal > 0
    ? Math.round(imovel.preco / imovel.areaTotal)
    : null;

  const diffPct = precoPorM2 && mediaEstadoM2
    ? Math.round((precoPorM2 - mediaEstadoM2) / mediaEstadoM2 * 100)
    : null;

  const leilaoFuturo = imovel.dataLeilao1Date
    ? new Date(imovel.dataLeilao1Date) > new Date()
    : false;

  const precoFmt = fmt(imovel.preco);
  const titulo   = `${imovel.tipo || "Imóvel"} em ${imovel.cidade}/${imovel.estado}`;

  const grupoLocal: [string, string][] = [
    ["Estado", imovel.estado],
    ["Cidade", imovel.cidade],
    ...(imovel.bairro   ? [["Bairro",   imovel.bairro]   as [string, string]] : []),
    ...(imovel.endereco ? [["Endereço", imovel.endereco] as [string, string]] : []),
    ...(imovel.cep      ? [["CEP",      imovel.cep]      as [string, string]] : []),
  ];

  const grupoCaract: [string, string][] = [
    ...(imovel.tipo        ? [["Tipo",           imovel.tipo]                    as [string, string]] : []),
    ...(imovel.areaTotal   ? [["Área total",     `${imovel.areaTotal} m²`]       as [string, string]] : []),
    ...(imovel.areaUtil    ? [["Área privativa", `${imovel.areaUtil} m²`]        as [string, string]] : []),
    ...(imovel.areaTerreno ? [["Área terreno",   `${imovel.areaTerreno} m²`]     as [string, string]] : []),
    ...(imovel.quartos     ? [["Quartos",        String(imovel.quartos)]          as [string, string]] : []),
    ...(imovel.suites      ? [["Suítes",         String(imovel.suites)]           as [string, string]] : []),
    ...(imovel.vagas       ? [["Vagas",          String(imovel.vagas)]            as [string, string]] : []),
    ...(imovel.ocupacao    ? [["Ocupação",       imovel.ocupacao]                 as [string, string]] : []),
  ];

  const grupoVenda: [string, string][] = [
    ["Modalidade",    imovel.modalidade || "—"],
    ["Financiamento", imovel.financiamento || "—"],
    ...(imovel.fgts !== undefined ? [["FGTS", imovel.fgts ? "Sim" : "Não"] as [string, string]] : []),
    ["N° do imóvel",  imovel.hdnImovel],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: titulo,
    description: imovel.descricao
      ? imovel.descricao.split("\n\n")[0].trim()
      : [
          imovel.tipo, imovel.modalidade,
          imovel.areaTotal ? `${imovel.areaTotal}m²` : null,
          imovel.quartos   ? `${imovel.quartos} quartos` : null,
          "Imóvel da Caixa Econômica Federal",
        ].filter(Boolean).join(" · "),
    url:   `${SITE_URL}/imovel/${imovel.hdnImovel}`,
    image: imovel.fotoUrl ?? `${SITE_URL}/logo.png`,
    offers: {
      "@type": "Offer",
      price:         imovel.preco,
      priceCurrency: "BRL",
      availability:  "https://schema.org/InStock",
      url:           imovel.urlDetalhe,
      seller: { "@type": "Organization", name: "Caixa Econômica Federal" },
    },
    address: {
      "@type":         "PostalAddress",
      streetAddress:   imovel.endereco || undefined,
      addressLocality: imovel.cidade,
      addressRegion:   imovel.estado,
      addressCountry:  "BR",
    },
    ...(imovel.lat && imovel.lng ? {
      geo: { "@type": "GeoCoordinates", latitude: imovel.lat, longitude: imovel.lng },
    } : {}),
  };

  return (
    <div className="max-w-4xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Botão de retorno ao filtro (quando vindo de alerta por e-mail) */}
      {volta && (
        <a
          href={volta}
          className="inline-flex items-center gap-1.5 mb-3 text-sm font-medium px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
        >
          ← Imóveis novos na sua região
        </a>
      )}

      {/* Breadcrumb */}
      <nav className="text-sm mb-3 flex items-center gap-1.5 flex-wrap">
        <a href="/" className="hover:underline" style={{ color: "#01304D" }}>Início</a>
        <span className="text-gray-400">/</span>
        <a
          href={`/imoveis/${imovel.estado.toLowerCase()}`}
          className="hover:underline"
          style={{ color: "#01304D" }}
        >
          {imovel.estado}
        </a>
        <span className="text-gray-400">/</span>
        <a
          href={`/imoveis/${imovel.estado.toLowerCase()}?cidade=${encodeURIComponent(imovel.cidade)}`}
          className="hover:underline"
          style={{ color: "#01304D" }}
        >
          {imovel.cidade}
        </a>
        {imovel.tipo && (
          <>
            <span className="text-gray-400">/</span>
            <span className="text-gray-500">{imovel.tipo}</span>
          </>
        )}
      </nav>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Foto com badges */}
        <div className="h-80 bg-gray-200 relative overflow-hidden">
          {imovel.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imovel.fotoUrl}
              alt={imovel.tipo || "Imóvel"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">🏠</div>
          )}

          {/* Badge strip — bottom-left */}
          <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap">
            {imovel.ocupacao === "Desocupado" && (
              <span className="text-xs font-semibold bg-green-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                Desocupado
              </span>
            )}
            {imovel.financiamento?.toLowerCase().includes("sim") && (
              <span className="text-xs font-semibold bg-blue-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                Financiamento
              </span>
            )}
            {imovel.fgts && (
              <span className="text-xs font-semibold bg-amber-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                FGTS
              </span>
            )}
            {leilaoFuturo && (
              <span className="text-xs font-semibold bg-orange-600 text-white px-2.5 py-1 rounded-full shadow-sm">
                🔨 Leilão {imovel.dataLeilao1}
              </span>
            )}
          </div>

          {/* Desconto — top-right */}
          {descPct && descPct > 0 && (
            <span
              className="absolute top-3 right-3 text-white font-bold px-3 py-1 rounded-full text-sm shadow"
              style={{ backgroundColor: "#01304D" }}
            >
              -{descPct}% de desconto
            </span>
          )}
        </div>

        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-800 mb-3">{titulo}</h1>

          {/* Preço + Economia */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <p className="text-3xl font-bold text-gray-900">{precoFmt}</p>
              {imovel.precoAval && (
                <p className="text-sm text-gray-400 line-through">
                  Avaliação: {fmt(imovel.precoAval)}
                </p>
              )}
            </div>
            {economia && (
              <span className="text-sm font-semibold bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full">
                Economia de {fmt(economia)}
              </span>
            )}
          </div>

          {/* Chips de características */}
          {(imovel.areaTotal || imovel.quartos || imovel.suites || imovel.vagas || imovel.modalidade || precoPorM2) && (
            <div className="flex flex-wrap gap-2 mb-5">
              {imovel.areaTotal  && <Chip icon="📐" label={`${imovel.areaTotal} m²`} />}
              {imovel.quartos    && <Chip icon="🛏" label={`${imovel.quartos} ${imovel.quartos === 1 ? "quarto" : "quartos"}`} />}
              {imovel.suites     && <Chip icon="🚿" label={`${imovel.suites} ${imovel.suites === 1 ? "suíte" : "suítes"}`} />}
              {imovel.vagas      && <Chip icon="🚗" label={`${imovel.vagas} ${imovel.vagas === 1 ? "vaga" : "vagas"}`} />}
              {imovel.modalidade && <Chip icon="🏢" label={imovel.modalidade} />}
              {precoPorM2        && <Chip icon="📍" label={`R$ ${precoPorM2.toLocaleString("pt-BR")}/m²`} />}
            </div>
          )}

          {/* Comparação preço/m² vs média do estado */}
          {precoPorM2 && mediaEstadoM2 && diffPct !== null && (
            <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                  Preço/m² vs. média de {imovel.tipo ? `${imovel.tipo}s` : "imóveis"} em {imovel.estado}
                </p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-bold text-gray-800">
                    R$&nbsp;{precoPorM2.toLocaleString("pt-BR")}/m²
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    diffPct <= 0
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-600"
                  }`}>
                    {diffPct <= 0
                      ? `${Math.abs(diffPct)}% abaixo da média`
                      : `${diffPct}% acima da média`}
                  </span>
                  <span className="text-xs text-gray-400">
                    (média: R$&nbsp;{mediaEstadoM2.toLocaleString("pt-BR")}/m²)
                  </span>
                </div>
              </div>
              {/* Mini barra de posição */}
              <div className="hidden sm:flex flex-col items-center gap-1 shrink-0 w-24">
                <div className="w-full h-1.5 bg-gray-200 rounded-full relative">
                  <div
                    className={`absolute top-0 h-1.5 rounded-full ${diffPct <= 0 ? "bg-green-500" : "bg-red-400"}`}
                    style={{ width: `${Math.min(100, Math.max(5, 50 + diffPct / 2))}%` }}
                  />
                  <div className="absolute top-0 left-1/2 w-px h-1.5 bg-gray-400 -translate-x-1/2" />
                </div>
                <span className="text-[10px] text-gray-400 text-center leading-tight">média</span>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="mb-6 flex flex-wrap gap-2">
            <a
              href={imovel.urlDetalhe}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-medium px-5 py-2 rounded-lg transition-opacity hover:opacity-90 text-sm"
              style={{ backgroundColor: "#01304D" }}
            >
              Ver no site da Caixa →
            </a>
            {imovel.editaiUrl && (
              <a
                href={imovel.editaiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2 rounded-lg transition-colors text-sm flex items-center gap-1"
              >
                📄 Edital
              </a>
            )}
            {imovel.matriculaUrl ? (
              <a
                href={imovel.matriculaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium px-5 py-2 rounded-lg transition-colors text-sm flex items-center gap-1"
              >
                📋 Baixar matrícula
              </a>
            ) : imovel.enriched ? (
              <a
                href={imovel.urlDetalhe}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-gray-300 hover:bg-gray-50 text-gray-600 font-medium px-5 py-2 rounded-lg transition-colors text-sm flex items-center gap-1"
                title="A matrícula pode estar disponível diretamente na página da Caixa"
              >
                📋 Ver matrícula na Caixa
              </a>
            ) : (
              <span
                className="border border-gray-200 text-gray-400 font-medium px-5 py-2 rounded-lg text-sm flex items-center gap-1 cursor-default"
                title="Matrícula ainda não processada — será adicionada em breve"
              >
                📋 Matrícula (em breve)
              </span>
            )}
          </div>

          {/* 3 colunas de informação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <InfoGroup title="📍 Localização" items={grupoLocal} />
            <InfoGroup title="🏠 Características" items={grupoCaract} />
            <InfoGroup title="📋 Condições de venda" items={grupoVenda} />
          </div>

          {/* Descrição gerada por IA */}
          {imovel.descricao && (
            <div className="bg-gray-50 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-700 text-sm">Sobre o imóvel</h2>
                <span className="text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                  ✦ gerado por IA
                </span>
              </div>
              <div className="text-sm text-gray-600 leading-relaxed space-y-3">
                {imovel.descricao.split("\n\n").map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          )}

          {/* Countdown + Histórico + Compartilhar + Mapa (client) */}
          <DetalheClient
            imovel={imovel}
            titulo={titulo}
            preco={precoFmt}
            endereco={imovel.endereco || `${imovel.cidade}/${imovel.estado}`}
            mapaLabel={`${imovel.tipo || "Imóvel"} — ${precoFmt}`}
          />
        </div>
      </div>

      {/* Imóveis similares */}
      {similares.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4">
            Imóveis similares em {imovel.cidade}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {similares.map((s) => {
              const simDesc = s.precoAval && s.preco
                ? Math.round((1 - s.preco / s.precoAval) * 100)
                : null;
              return (
                <a
                  key={s.hdnImovel}
                  href={`/imovel/${s.hdnImovel}`}
                  className="border border-gray-100 rounded-xl overflow-hidden hover:border-[#01304D] hover:shadow-md transition-all block"
                >
                  <div className="relative h-36 bg-gray-100">
                    {s.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.fotoUrl}
                        alt={s.tipo || "Imóvel"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">🏠</div>
                    )}
                    {simDesc && simDesc > 0 && (
                      <span
                        className="absolute top-2 right-2 text-xs font-bold text-white px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#01304D" }}
                      >
                        -{simDesc}%
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-500">{s.tipo || "Imóvel"}</p>
                    <p className="font-semibold text-gray-900 text-sm mt-0.5">{fmt(s.preco)}</p>
                    {(s.areaTotal || s.quartos) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[
                          s.areaTotal ? `${s.areaTotal} m²` : null,
                          s.quartos   ? `${s.quartos} ${s.quartos === 1 ? "quarto" : "quartos"}` : null,
                        ].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Bloco leilão */}
      {(imovel.leiloeiro || imovel.dataLeilao1 || imovel.edital) && (
        <div className="mt-6 bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            🔨 Informações do Leilão
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {imovel.leiloeiro && (
              <div className="flex justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-500">Leiloeiro(a)</span>
                <span className="font-medium text-gray-800 text-right max-w-[60%]">{imovel.leiloeiro}</span>
              </div>
            )}
            {imovel.edital && (
              <div className="flex justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-500">Edital</span>
                <span className="font-medium text-gray-800">{imovel.edital}</span>
              </div>
            )}
            {imovel.dataLeilao1 && (
              <div className="flex justify-between bg-orange-50 rounded-lg px-3 py-2">
                <span className="text-gray-500">1º Leilão</span>
                <span className="font-semibold text-orange-700">{imovel.dataLeilao1}</span>
              </div>
            )}
            {imovel.dataLeilao2 && (
              <div className="flex justify-between bg-orange-50 rounded-lg px-3 py-2">
                <span className="text-gray-500">2º Leilão</span>
                <span className="font-semibold text-orange-700">{imovel.dataLeilao2}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Corretores parceiros */}
      <div className="mt-6 bg-white rounded-xl shadow p-5">
        <h2 className="font-semibold text-gray-700 mb-1">
          Precisa de ajuda para arrematar?
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Corretores parceiros especializados em imóveis da Caixa em{" "}
          <span className="font-medium">{imovel.estado}</span>.
        </p>

        {corretoresEstado.length > 0 ? (
          <div className="flex flex-col gap-3">
            {corretoresEstado.map((c: Corretor) => (
              <a
                key={c._id}
                href={`/corretores/${c.slug}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-[#01304D] hover:bg-gray-50 transition-colors"
              >
                {c.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.foto}
                    alt={c.nome}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-lg">
                    👤
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{c.nome}</p>
                  <p className="text-xs text-gray-500">{c.cidade} · CRECI: {c.creci}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {c.categoria === "credenciado_caixa" && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      Credenciado
                    </span>
                  )}
                  {c.whatsapp && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      WhatsApp
                    </span>
                  )}
                </div>
              </a>
            ))}
            <a href="/corretores" className="text-xs hover:underline mt-1" style={{ color: "#01304D" }}>
              Ver todos os corretores parceiros →
            </a>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-sm text-gray-500 flex-1">
              Ainda não temos corretores cadastrados em <span className="font-medium">{imovel.estado}</span>. Fale conosco pelo WhatsApp e indicamos um parceiro manualmente.
            </p>
            <a
              href={`https://wa.me/${SITE_WHATSAPP}?text=${encodeURIComponent(`Olá! Vi o imóvel em ${imovel.cidade}/${imovel.estado} no Busca Leilões Caixa e gostaria de falar com um corretor parceiro.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#25D366" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="16" height="16">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Falar no WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
