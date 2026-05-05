import {
  Document, Page, Text, View, Image,
  StyleSheet, Link,
} from "@react-pdf/renderer";
import { Imovel } from "@/lib/types";
import { SITE_URL, SITE_NAME } from "@/lib/config";

const DARK  = "#01112c";
const BLUE  = "#2563eb";
const GRAY  = "#6b7280";
const BG    = "#f3f4f6";
const GREEN = "#16a34a";
const ORANGE = "#ea580c";

const s = StyleSheet.create({
  page:    { padding: 36, fontFamily: "Helvetica", fontSize: 9, color: "#1f2937" },
  header:  { backgroundColor: DARK, padding: "10 16", marginBottom: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hTitle:  { color: "white", fontSize: 13, fontFamily: "Helvetica-Bold" },
  hSub:    { color: "#93c5fd", fontSize: 7.5 },
  foto:    { width: "100%", height: 190, marginBottom: 12 },
  titulo:  { fontSize: 15, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 2 },
  end:     { fontSize: 8.5, color: GRAY, marginBottom: 8 },
  preco:   { fontSize: 20, fontFamily: "Helvetica-Bold", color: DARK },
  aval:    { fontSize: 8, color: GRAY, marginTop: 1, marginBottom: 10 },
  badge:   { backgroundColor: GREEN, color: "white", padding: "2 7", borderRadius: 20, fontSize: 8, fontFamily: "Helvetica-Bold" },
  secTitle:{ fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 12 },
  grid:    { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  cell:    { flexDirection: "row", justifyContent: "space-between", backgroundColor: BG, padding: "4 7", borderRadius: 3, width: "48.7%" },
  cellFull:{ flexDirection: "row", justifyContent: "space-between", backgroundColor: BG, padding: "4 7", borderRadius: 3, width: "100%", marginBottom: 3 },
  lCell:   { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#fff7ed", borderLeft: "2 solid #ea580c", padding: "4 7", borderRadius: 3, width: "48.7%" },
  label:   { color: GRAY, fontSize: 8.5 },
  value:   { fontFamily: "Helvetica-Bold", fontSize: 8.5, maxWidth: "60%", textAlign: "right" },
  lValue:  { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: ORANGE },
  link:    { fontSize: 8, color: BLUE },
  footer:  { position: "absolute", bottom: 18, left: 36, right: 36, borderTop: "0.5 solid #d1d5db", paddingTop: 5, flexDirection: "row", justifyContent: "space-between" },
  fText:   { color: GRAY, fontSize: 7.5 },
});

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function ImovelPDF({ imovel }: { imovel: Imovel }) {
  const titulo  = `${imovel.tipo || "Imóvel"} em ${imovel.cidade}/${imovel.estado}`;
  const descPct = imovel.precoAval && imovel.preco
    ? Math.round((1 - imovel.preco / imovel.precoAval) * 100)
    : null;
  const pageUrl = `${SITE_URL}/imovel/${imovel.hdnImovel}`;
  const mapsUrl = imovel.lat && imovel.lng
    ? `https://www.google.com/maps?q=${imovel.lat},${imovel.lng}`
    : `https://www.google.com/maps/search/${encodeURIComponent(`${imovel.endereco}, ${imovel.cidade}, ${imovel.estado}, Brasil`)}`;
  const hoje = new Date().toLocaleDateString("pt-BR");

  const infos: [string, string][] = [
    ["Estado",         imovel.estado],
    ["Cidade",         imovel.cidade],
    ["Bairro",         imovel.bairro || "—"],
    ["Tipo",           imovel.tipo || "—"],
    ["Modalidade",     imovel.modalidade || "—"],
    ["Financiamento",  imovel.financiamento || "—"],
    ...(imovel.fgts !== undefined ? [["FGTS", imovel.fgts ? "Sim" : "Não"] as [string, string]] : []),
    ...(imovel.ocupacao  ? [["Ocupação",       imovel.ocupacao]                  as [string, string]] : []),
    ["Área total",     imovel.areaTotal   ? `${imovel.areaTotal} m²`   : "—"],
    ["Área privativa", imovel.areaUtil    ? `${imovel.areaUtil} m²`    : "—"],
    ...(imovel.areaTerreno ? [["Área terreno", `${imovel.areaTerreno} m²`]        as [string, string]] : []),
    ["Quartos",        imovel.quartos     ? `${imovel.quartos}`        : "—"],
    ...(imovel.suites  ? [["Suítes",           `${imovel.suites}`]               as [string, string]] : []),
    ["Vagas",          imovel.vagas       ? `${imovel.vagas}`          : "—"],
    ...(imovel.cep     ? [["CEP",             imovel.cep]                        as [string, string]] : []),
    ["N° do imóvel",   imovel.hdnImovel],
  ];

  const temLeilao = imovel.leiloeiro || imovel.dataLeilao1 || imovel.edital;

  return (
    <Document title={titulo} author={SITE_NAME} subject="Imóvel Caixa Econômica Federal">
      <Page size="A4" style={s.page}>

        {/* Cabeçalho */}
        <View style={s.header} fixed>
          <View>
            <Text style={s.hTitle}>{SITE_NAME}</Text>
            <Text style={s.hSub}>buscaleiloescaixa.com.br</Text>
          </View>
          <Text style={{ color: "#93c5fd", fontSize: 7.5 }}>Imóveis da Caixa Econômica Federal</Text>
        </View>

        {/* Foto */}
        {imovel.fotoUrl && (
          <Image src={imovel.fotoUrl} style={s.foto} />
        )}

        {/* Título e preço */}
        <Text style={s.titulo}>{titulo}</Text>
        <Text style={s.end}>{imovel.endereco || `${imovel.cidade}/${imovel.estado}`}</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 }}>
          <Text style={s.preco}>{fmt(imovel.preco)}</Text>
          {descPct && descPct > 0 && (
            <Text style={s.badge}>-{descPct}% de desconto</Text>
          )}
        </View>
        {imovel.precoAval && (
          <Text style={s.aval}>Avaliação: {fmt(imovel.precoAval)}</Text>
        )}

        {/* Informações */}
        <Text style={s.secTitle}>Informações do Imóvel</Text>
        <View style={s.grid}>
          {infos.map(([label, val]) => (
            <View key={label} style={s.cell}>
              <Text style={s.label}>{label}</Text>
              <Text style={s.value}>{val}</Text>
            </View>
          ))}
        </View>

        {/* Endereço + Mapa */}
        <Text style={s.secTitle}>Localização</Text>
        <View style={s.cellFull}>
          <Text style={s.label}>Endereço</Text>
          <Text style={s.value}>
            {[imovel.endereco, imovel.bairro, imovel.cidade, imovel.estado, imovel.cep]
              .filter(Boolean).join(" — ")}
          </Text>
        </View>
        <View style={s.cellFull}>
          <Text style={s.label}>Ver no Google Maps</Text>
          <Link src={mapsUrl} style={s.link}>{mapsUrl}</Link>
        </View>

        {/* Leilão */}
        {temLeilao && (
          <>
            <Text style={s.secTitle}>Informações do Leilão</Text>
            <View style={s.grid}>
              {imovel.leiloeiro && (
                <View style={s.lCell}>
                  <Text style={s.label}>Leiloeiro(a)</Text>
                  <Text style={s.value}>{imovel.leiloeiro}</Text>
                </View>
              )}
              {imovel.edital && (
                <View style={s.lCell}>
                  <Text style={s.label}>Edital</Text>
                  <Text style={s.value}>{imovel.edital}</Text>
                </View>
              )}
              {imovel.dataLeilao1 && (
                <View style={s.lCell}>
                  <Text style={s.label}>1º Leilão</Text>
                  <Text style={s.lValue}>{imovel.dataLeilao1}</Text>
                </View>
              )}
              {imovel.dataLeilao2 && (
                <View style={s.lCell}>
                  <Text style={s.label}>2º Leilão</Text>
                  <Text style={s.lValue}>{imovel.dataLeilao2}</Text>
                </View>
              )}
            </View>
            {imovel.editaiUrl && (
              <View style={{ marginTop: 4 }}>
                <Text style={s.label}>
                  PDF do Edital:{" "}
                  <Link src={imovel.editaiUrl} style={s.link}>{imovel.editaiUrl}</Link>
                </Text>
              </View>
            )}
          </>
        )}

        {/* Links */}
        <Text style={s.secTitle}>Links</Text>
        <View style={s.cellFull}>
          <Text style={s.label}>Página na Caixa Econômica Federal</Text>
          <Link src={imovel.urlDetalhe} style={s.link}>{imovel.urlDetalhe}</Link>
        </View>
        <View style={s.cellFull}>
          <Text style={s.label}>Ver no {SITE_NAME}</Text>
          <Link src={pageUrl} style={s.link}>{pageUrl}</Link>
        </View>

        {/* Rodapé */}
        <View style={s.footer} fixed>
          <Text style={s.fText}>Gerado em {hoje} — {SITE_NAME}</Text>
          <Text style={s.fText}>Dados obtidos do site oficial da Caixa Econômica Federal</Text>
        </View>

      </Page>
    </Document>
  );
}
