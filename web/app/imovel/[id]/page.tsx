import { notFound } from "next/navigation";
import { Metadata } from "next";
import clientPromise from "@/lib/mongodb";
import { Imovel } from "@/lib/types";
import { ObjectId } from "mongodb";
import DetalheClient from "@/components/DetalheClient";
import { SITE_URL, SITE_NAME, SITE_EMAIL } from "@/lib/config";
import { getCorretoresAprovados, Corretor } from "@/lib/corretores";

function fmt(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

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
  const desc    = [
    titulo,
    preco ? `por ${preco}` : null,
    imovel.modalidade || null,
    imovel.areaTotal ? `${imovel.areaTotal}m²` : null,
    imovel.quartos   ? `${imovel.quartos} quartos` : null,
    `Imóvel da Caixa Econômica Federal.`,
  ].filter(Boolean).join(" · ");

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

export default async function DetalheImovel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [imovel, todosCorretores] = await Promise.all([
    getImovel(id),
    getCorretoresAprovados(),
  ]);
  if (!imovel) notFound();

  const corretoresEstado = todosCorretores
    .filter((c) => c.estado === imovel.estado)
    .slice(0, 3);

  const descPct = imovel.precoAval && imovel.preco
    ? Math.round((1 - imovel.preco / imovel.precoAval) * 100)
    : null;

  const precoFmt = fmt(imovel.preco);
  const titulo   = `${imovel.tipo || "Imóvel"} em ${imovel.cidade}/${imovel.estado}`;

  const info: [string, string][] = [
    ["Estado",         imovel.estado],
    ["Cidade",         imovel.cidade],
    ["Bairro",         imovel.bairro || "—"],
    ["Endereço",       imovel.endereco || "—"],
    ...(imovel.cep          ? [["CEP",             imovel.cep]                       as [string,string]] : []),
    ["Tipo",           imovel.tipo || "—"],
    ["Modalidade",     imovel.modalidade || "—"],
    ["Financiamento",  imovel.financiamento || "—"],
    ...(imovel.fgts !== undefined ? [["FGTS",       imovel.fgts ? "Sim" : "Não"]     as [string,string]] : []),
    ...(imovel.ocupacao     ? [["Ocupação",         imovel.ocupacao]                 as [string,string]] : []),
    ["Área total",     imovel.areaTotal   ? `${imovel.areaTotal} m²`   : "—"],
    ["Área privativa", imovel.areaUtil    ? `${imovel.areaUtil} m²`    : "—"],
    ["Área terreno",   imovel.areaTerreno ? `${imovel.areaTerreno} m²` : "—"],
    ["Quartos",        imovel.quartos     ? String(imovel.quartos)      : "—"],
    ...(imovel.suites       ? [["Suítes",           String(imovel.suites)]            as [string,string]] : []),
    ["Vagas",          imovel.vagas       ? String(imovel.vagas)        : "—"],
    ["N° do imóvel",   imovel.hdnImovel],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: titulo,
    description: [
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
      "@type":           "PostalAddress",
      streetAddress:     imovel.endereco  || undefined,
      addressLocality:   imovel.cidade,
      addressRegion:     imovel.estado,
      addressCountry:    "BR",
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
      <a href="/" className="hover:underline text-sm mb-4 inline-block" style={{ color: "#4338CA" }}>← Voltar à listagem</a>

      <div className="bg-white rounded-xl shadow overflow-hidden mt-2">
        {/* Foto */}
        <div className="h-72 bg-gray-200 relative overflow-hidden">
          {imovel.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imovel.fotoUrl} alt={imovel.tipo || "Imóvel"} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">🏠</div>
          )}
          {descPct && descPct > 0 && (
            <span className="absolute top-3 right-3 text-white font-bold px-3 py-1 rounded-full text-sm" style={{ backgroundColor: "#4338CA" }}>
              -{descPct}% de desconto
            </span>
          )}
        </div>

        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-800 mb-3">{titulo}</h1>

          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div>
              <p className="text-3xl font-bold text-gray-900">{precoFmt}</p>
              {imovel.precoAval && (
                <p className="text-sm text-gray-400 line-through">Avaliação: {fmt(imovel.precoAval)}</p>
              )}
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            <a
              href={imovel.urlDetalhe}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-medium px-5 py-2 rounded-lg transition-opacity hover:opacity-90 text-sm"
              style={{ backgroundColor: "#4338CA" }}
            >
              Ver no site da Caixa →
            </a>
            {imovel.editaiUrl && (
              <a href={imovel.editaiUrl} target="_blank" rel="noopener noreferrer"
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2 rounded-lg transition-colors text-sm flex items-center gap-1">
                📄 Baixar edital
              </a>
            )}
            {imovel.matriculaUrl && (
              <a href={imovel.matriculaUrl} target="_blank" rel="noopener noreferrer"
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium px-5 py-2 rounded-lg transition-colors text-sm flex items-center gap-1">
                📋 Baixar matrícula
              </a>
            )}
          </div>

          {/* Informações */}
          <h2 className="font-semibold mb-3 text-xs uppercase tracking-widest" style={{ color: "#4338CA" }}>Informações do imóvel</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
            {info.map(([label, val]) => (
              <div key={label} className="flex justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-800 text-right max-w-[60%]">{val}</span>
              </div>
            ))}
          </div>

          {/* Compartilhar + PDF + Mapa (client) */}
          <DetalheClient
            imovel={imovel}
            titulo={titulo}
            preco={precoFmt}
            endereco={imovel.endereco || `${imovel.cidade}/${imovel.estado}`}
            mapaLabel={`${imovel.tipo || "Imóvel"} — ${precoFmt}`}
          />
        </div>
      </div>

      {/* Bloco leilão — aparece apenas quando há dados do leiloeiro ou datas */}
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
              <a key={c._id} href={`/corretores/${c.slug}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-[#4338CA] hover:bg-gray-50 transition-colors">
                {c.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.foto} alt={c.nome}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200" />
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
            <a href="/corretores" className="text-xs hover:underline mt-1" style={{ color: "#4338CA" }}>
              Ver todos os corretores parceiros →
            </a>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 flex-1">
              Ainda não temos corretores parceiros em {imovel.estado}. Entre em contato conosco para indicação.
            </p>
            <a
              href={`mailto:${SITE_EMAIL}?subject=Indica%C3%A7%C3%A3o%20de%20corretor%20em%20${imovel.estado}&body=Ol%C3%A1%2C%20encontrei%20o%20im%C3%B3vel%20${imovel.hdnImovel}%20em%20${imovel.cidade}%2F${imovel.estado}%20e%20gostaria%20de%20indica%C3%A7%C3%A3o%20de%20corretor.`}
              className="shrink-0 text-sm hover:underline" style={{ color: "#4338CA" }}>
              Solicitar indicação →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
