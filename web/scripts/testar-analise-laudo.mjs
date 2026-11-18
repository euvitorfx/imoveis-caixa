/**
 * Testa o fluxo completo de análise de matrícula para um laudo existente.
 * Uso: node scripts/testar-analise-laudo.mjs <laudoId>
 */
import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv(p) {
  try {
    for (const line of readFileSync(p, "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv(resolve("C:/Users/vitor/imoveis-caixa/web/.env.local"));

const laudoId = process.argv[2];
if (!laudoId || !ObjectId.isValid(laudoId)) {
  console.error("Uso: node scripts/testar-analise-laudo.mjs <laudoId>");
  process.exit(1);
}

const mongoClient = new MongoClient(process.env.MONGODB_URI);
await mongoClient.connect();
const db = mongoClient.db(process.env.MONGODB_DB);

// Busca o laudo
const laudoDoc = await db.collection("laudos").findOne({ _id: new ObjectId(laudoId) });
if (!laudoDoc) { console.error("Laudo não encontrado."); process.exit(1); }
console.log(`\nLaudo #${laudoDoc.numero} — ${laudoDoc.imovelDescricao}`);

// Busca o imóvel
const imovel = await db.collection("imoveis").findOne(
  { _id: new ObjectId(laudoDoc.imovelId) },
  { projection: { matriculaUrl: 1, matriculaPdfR2Url: 1, urlDetalhe: 1, hdnImovel: 1, cidade: 1, estado: 1, tipo: 1, averbacaoLeiloes: 1, ocupacao: 1, modalidade: 1 } }
);
console.log(`Imóvel: ${imovel?.hdnImovel} — matriculaUrl: ${imovel?.matriculaUrl ?? "❌ ausente"}`);

const CAIXA_BASE = "https://venda-imoveis.caixa.gov.br";

// 1. Resolve matriculaUrl
let matriculaUrl = imovel?.matriculaUrl ?? laudoDoc.imovelData?.matriculaUrl;

if (!matriculaUrl) {
  const urlDetalhe = imovel?.urlDetalhe
    ?? laudoDoc.imovelData?.urlDetalhe
    ?? (imovel?.hdnImovel ? `${CAIXA_BASE}/sistema/detalhe-imovel.asp?hdnimovel=${imovel.hdnImovel}` : null)
    ?? (laudoDoc.imovelData?.hdnImovel ? `${CAIXA_BASE}/sistema/detalhe-imovel.asp?hdnimovel=${laudoDoc.imovelData.hdnImovel}` : null);

  console.log(`\nBuscando matriculaUrl na Caixa: ${urlDetalhe}`);
  const pageRes = await fetch(urlDetalhe, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (pageRes.ok) {
    const html = await pageRes.text();
    const match = html.match(/ExibeDoc\(['"]([^'"]*matricula[^'"]*\.pdf)['"]/i);
    if (match) {
      const path = match[1];
      matriculaUrl = path.startsWith("/") ? `${CAIXA_BASE}${path}` : path;
      console.log(`✅ matriculaUrl encontrada: ${matriculaUrl}`);
      await db.collection("imoveis").updateOne({ _id: imovel._id }, { $set: { matriculaUrl } });
    } else {
      console.log("❌ matriculaUrl não encontrada na página da Caixa.");
      console.log("Trecho relevante do HTML:");
      const idx = html.indexOf("matricula");
      if (idx > -1) console.log(html.slice(Math.max(0, idx - 100), idx + 200));
      else console.log("(nenhuma ocorrência de 'matricula' no HTML)");
      await mongoClient.close(); process.exit(1);
    }
  } else {
    console.log(`❌ Falha ao acessar a página da Caixa: HTTP ${pageRes.status}`);
    await mongoClient.close(); process.exit(1);
  }
}

// 2. Download do PDF
console.log(`\nBaixando PDF: ${matriculaUrl}`);
const pdfRes = await fetch(matriculaUrl);
if (!pdfRes.ok) { console.error(`Falha: HTTP ${pdfRes.status}`); await mongoClient.close(); process.exit(1); }
const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
console.log(`✅ PDF: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

// 3. Upload para R2
const hdnImovel = imovel?.hdnImovel ?? laudoDoc.imovelData?.hdnImovel;
let matriculaPdfR2Url;
if (hdnImovel) {
  const { S3Client, PutObjectCommand, HeadObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  });
  const key = `matriculas/${hdnImovel}.pdf`;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL.replace(/\/$/, "");

  let jaExiste = false;
  try { await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); jaExiste = true; } catch {}

  if (jaExiste) {
    matriculaPdfR2Url = `${publicUrl}/${key}`;
    console.log(`✅ PDF já no R2: ${matriculaPdfR2Url}`);
  } else {
    console.log(`\nFazendo upload para R2: ${key}`);
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: pdfBuffer, ContentType: "application/pdf" }));
    matriculaPdfR2Url = `${publicUrl}/${key}`;
    console.log(`✅ Upload concluído: ${matriculaPdfR2Url}`);
    await db.collection("imoveis").updateOne({ _id: imovel._id }, { $set: { matriculaPdfR2Url } });
  }
}

// 4. Análise com Claude
console.log(`\nChamando Claude API...`);
const { default: Anthropic } = await import("@anthropic-ai/sdk");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const pdfBase64 = pdfBuffer.toString("base64");
const response = await anthropic.messages.create({
  model: "claude-opus-5-5",
  max_tokens: 16384,
  messages: [{
    role: "user",
    content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
      { type: "text", text: `Você é especialista em direito imobiliário brasileiro. Analise esta matrícula e retorne SOMENTE JSON com: numeroMatricula, cartorio, municipio, titularAtual, alertas (gravidade/descricao), resumoMatricula (markdown), resumoJuridico (markdown), limitacoes.` },
    ],
  }],
});

const { input_tokens, output_tokens } = response.usage;
const custoUSD = +(input_tokens * 4 / 1e6 + output_tokens * 20 / 1e6).toFixed(6);
console.log(`✅ Tokens: ${input_tokens} entrada / ${output_tokens} saída — US$ ${custoUSD.toFixed(4)}`);

const textBlock = response.content.find(b => b.type === "text");
const text = textBlock?.text ?? "";
const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
let analise;
try { analise = JSON.parse(cleaned); }
catch { console.log("❌ Falha no parse. Resposta raw:\n", text.slice(0, 500)); await mongoClient.close(); process.exit(1); }

console.log(`\nMatrícula: ${analise.numeroMatricula}`);
console.log(`Titular: ${analise.titularAtual}`);
console.log(`Alertas: ${analise.alertas?.length ?? 0}`);
analise.alertas?.forEach(a => console.log(`  [${a.gravidade}] ${a.descricao}`));

// 5. Salva no laudo
const agora = new Date().toISOString();
const novaEntradaIA = { tipo: "matricula", modelo: "claude-opus-5-5", inputTokens: input_tokens, outputTokens: output_tokens, custoUSD, em: agora };
await db.collection("laudos").updateOne(
  { _id: new ObjectId(laudoId) },
  {
    $set: {
      ...(matriculaPdfR2Url ? { matriculaPdfR2Url } : {}),
      "blocos.matricula": { status: "concluido", conteudo: analise.resumoMatricula, atualizadoEm: agora },
      "blocos.juridica":  { status: "concluido", conteudo: analise.resumoJuridico,  atualizadoEm: agora },
      atualizadoEm: agora,
    },
    $push: { analisesIA: novaEntradaIA },
  }
);
console.log(`\n✅ Laudo atualizado no banco.`);
if (matriculaPdfR2Url) console.log(`   PDF R2: ${matriculaPdfR2Url}`);

await mongoClient.close();
