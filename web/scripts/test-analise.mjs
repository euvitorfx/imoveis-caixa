import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { resolve } from "path";
import Anthropic from "@anthropic-ai/sdk";

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
loadEnv(resolve("web/.env.local"));

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB);

// Busca imóvel com matriculaUrl
const imovel = await db.collection("imoveis")
  .findOne(
    { matriculaUrl: { $exists: true, $ne: null } },
    { projection: { matriculaUrl: 1, cidade: 1, uf: 1, tipo: 1, descricao: 1 } }
  );

if (!imovel?.matriculaUrl) {
  console.log("Nenhum imóvel com matriculaUrl encontrado.");
  await client.close();
  process.exit(0);
}

console.log(`\nImóvel: ${imovel._id}`);
console.log(`Cidade: ${imovel.cidade}/${imovel.uf}`);
console.log(`PDF: ${imovel.matriculaUrl}\n`);

// Baixa o PDF
console.log("Baixando PDF...");
const res = await fetch(imovel.matriculaUrl);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const buffer = await res.arrayBuffer();
const pdfBase64 = Buffer.from(buffer).toString("base64");
console.log(`PDF: ${(buffer.byteLength / 1024).toFixed(1)} KB\n`);

// Chama Claude
console.log("Chamando Claude API (claude-opus-5-5)...");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-opus-5-5";
const PRECO_INPUT  = 4.00  / 1_000_000;
const PRECO_OUTPUT = 20.00 / 1_000_000;

const response = await anthropic.messages.create({
  model: MODEL,
  max_tokens: 16384,
  messages: [{
    role: "user",
    content: [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
      },
      {
        type: "text",
        text: `Você é especialista em direito imobiliário brasileiro. Analise esta matrícula e retorne SOMENTE um JSON com os campos: numeroMatricula, cartorio, municipio, titularAtual, pessoas (array com nome/cpf/qualificacao), gravames (tipo/status/descricao), alertas (gravidade/descricao), resumoMatricula (markdown), resumoJuridico (markdown), limitacoes (array).`,
      },
    ],
  }],
});

const { input_tokens, output_tokens } = response.usage;
const custoUSD = +(input_tokens * PRECO_INPUT + output_tokens * PRECO_OUTPUT).toFixed(6);

console.log(`\n✅ Análise concluída!`);
console.log(`   Tokens entrada : ${input_tokens.toLocaleString("pt-BR")}`);
console.log(`   Tokens saída   : ${output_tokens.toLocaleString("pt-BR")}`);
console.log(`   Custo          : US$ ${custoUSD.toFixed(4)} (≈ R$ ${(custoUSD * 5.5).toFixed(2)})\n`);

console.log("Blocos:", response.content.map(b => b.type).join(", "));
const textBlock = response.content.find(b => b.type === "text");
const text = textBlock?.type === "text" ? textBlock.text : "";
const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
try {
  const analise = JSON.parse(cleaned);
  console.log(JSON.stringify(analise, null, 2));
} catch (e) {
  console.log("Resposta raw:", text);
}

await client.close();
