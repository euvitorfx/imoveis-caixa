/**
 * Testa o fluxo completo: análise de matrícula (prompt completo) + pesquisa jurídica.
 * Uso: node scripts/testar-fluxo-completo.mjs <laudoId>
 */
import { MongoClient, ObjectId } from "mongodb";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import Anthropic from "@anthropic-ai/sdk";
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
  console.error("Uso: node scripts/testar-fluxo-completo.mjs <laudoId>");
  process.exit(1);
}

const mongoClient = new MongoClient(process.env.MONGODB_URI);
await mongoClient.connect();
const db = mongoClient.db(process.env.MONGODB_DB);

const laudoDoc = await db.collection("laudos").findOne({ _id: new ObjectId(laudoId) });
if (!laudoDoc) { console.error("Laudo não encontrado."); process.exit(1); }
console.log(`\nLaudo #${laudoDoc.numero} — ${laudoDoc.imovelDescricao}\n`);

const imovel = await db.collection("imoveis").findOne(
  { _id: new ObjectId(laudoDoc.imovelId) },
  { projection: { matriculaUrl: 1, matriculaPdfR2Url: 1, urlDetalhe: 1, hdnImovel: 1, cidade: 1, estado: 1, tipo: 1, averbacaoLeiloes: 1, ocupacao: 1, modalidade: 1 } }
);

// ─── ETAPA 1: ANÁLISE DE MATRÍCULA ──────────────────────────────────────────

const CAIXA_BASE = "https://venda-imoveis.caixa.gov.br";

// Resolve matriculaUrl
let matriculaUrl = imovel?.matriculaUrl ?? laudoDoc.imovelData?.matriculaUrl;
if (!matriculaUrl) {
  const urlDetalhe = imovel?.urlDetalhe
    ?? `${CAIXA_BASE}/sistema/detalhe-imovel.asp?hdnimovel=${imovel?.hdnImovel ?? laudoDoc.imovelData?.hdnImovel}`;
  console.log(`Buscando matriculaUrl em: ${urlDetalhe}`);
  const pageRes = await fetch(urlDetalhe, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (pageRes.ok) {
    const html = await pageRes.text();
    const match = html.match(/ExibeDoc\(['"]([^'"]*matricula[^'"]*\.pdf)['"]/i);
    if (match) {
      const path = match[1];
      matriculaUrl = path.startsWith("/") ? `${CAIXA_BASE}${path}` : path;
      await db.collection("imoveis").updateOne({ _id: imovel._id }, { $set: { matriculaUrl } });
      console.log(`✅ matriculaUrl: ${matriculaUrl}`);
    }
  }
}
if (!matriculaUrl) { console.error("❌ matriculaUrl não encontrada."); await mongoClient.close(); process.exit(1); }

// Download PDF (do R2 se já tiver, senão da Caixa)
const pdfSrc = imovel?.matriculaPdfR2Url ?? matriculaUrl;
console.log(`\nBaixando PDF: ${pdfSrc}`);
const pdfRes = await fetch(pdfSrc);
if (!pdfRes.ok) { console.error(`❌ HTTP ${pdfRes.status}`); await mongoClient.close(); process.exit(1); }
const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
console.log(`✅ PDF: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

// Upload R2 (idempotente)
const hdnImovel = imovel?.hdnImovel ?? laudoDoc.imovelData?.hdnImovel;
let matriculaPdfR2Url = imovel?.matriculaPdfR2Url;
if (hdnImovel && !matriculaPdfR2Url) {
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
  if (!jaExiste) {
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: pdfBuffer, ContentType: "application/pdf" }));
    console.log(`✅ PDF salvo no R2.`);
  }
  matriculaPdfR2Url = `${publicUrl}/${key}`;
  await db.collection("imoveis").updateOne({ _id: imovel._id }, { $set: { matriculaPdfR2Url } });
}

// Contexto
const dadosCaixaStr = [
  imovel?.averbacaoLeiloes ? `- Averbação dos leilões negativos (site Caixa): ${imovel.averbacaoLeiloes}` : "",
  imovel?.ocupacao ? `- Situação de ocupação (site Caixa): ${imovel.ocupacao}` : "",
  imovel?.modalidade ? `- Modalidade de venda (site Caixa): ${imovel.modalidade}` : "",
].filter(Boolean).join("\n");

const ctx = [
  `Imóvel: ${imovel?.tipo ?? ""} em ${imovel?.cidade ?? ""}/${imovel?.estado ?? ""}.`,
  dadosCaixaStr ? `\nDados atuais do site da Caixa Econômica Federal (podem ser mais recentes que a matrícula):\n${dadosCaixaStr}` : "",
].filter(Boolean).join("\n");

const prompt = `Você é um especialista em direito imobiliário e registral brasileiro com 20 anos de experiência em leilões da Caixa Econômica Federal. Analise esta matrícula com profundidade técnica e produza um laudo completo em formato JSON.

${ctx}

Retorne SOMENTE um JSON válido com esta estrutura exata (sem markdown, sem explicações fora do JSON):

{
  "numeroMatricula": "string ou null",
  "cartorio": "string ou null",
  "municipio": "string ou null",
  "endereco": "string ou null",
  "area": "string ou null",
  "titularAtual": "string ou null",
  "pessoas": [
    {
      "nome": "string",
      "cpf": "string ou null — formato XXX.XXX.XXX-XX se encontrado",
      "qualificacao": "ex-mutuário | cônjuge | fiduciante | credor | outro",
      "estadoCivil": "solteiro | casado | divorciado | viúvo | null — extraia da matrícula se mencionado",
      "conjugeNome": "string ou null — nome do cônjuge se o documento mencionar",
      "conjugeCpf": "string ou null — CPF do cônjuge se encontrado"
    }
  ],
  "atos": [
    {
      "identificador": "R-1 / AV-2 / etc",
      "tipo": "string",
      "data": "string ou null",
      "descricao": "string detalhada — inclua valores, partes e consequências jurídicas",
      "partes": ["array de nomes completos"]
    }
  ],
  "gravames": [
    {
      "tipo": "penhora | hipoteca | alienação fiduciária | indisponibilidade | outro",
      "status": "ativo | cancelado | indeterminado",
      "descricao": "string detalhada",
      "dataRegistro": "string ou null",
      "credor": "string ou null"
    }
  ],
  "alienacaoFiduciaria": {
    "registrada": true,
    "consolidada": true,
    "credor": "string ou null",
    "dataConsolidacao": "string ou null",
    "observacoes": "string detalhada sobre o processo de consolidação"
  },
  "alertas": [
    {
      "gravidade": "critico | alto | medio | baixo",
      "descricao": "string clara, objetiva e específica — cite números, datas e partes envolvidas"
    }
  ],
  "resumoMatricula": "## Análise Registral\\n\\nTexto COMPLETO e DETALHADO em Markdown. Deve incluir:\\n1. Identificação do imóvel (matrícula, cartório, endereço, área)\\n2. Histórico de propriedade (cadeia dominial desde o registro de abertura)\\n3. Todos os atos registrais relevantes com datas e partes\\n4. Situação atual da alienação fiduciária\\n5. Gravames ativos e cancelados\\n6. Situação do imóvel perante o registro de imóveis\\n\\nUse cabeçalhos (##, ###), negrito para dados importantes, e seja detalhado.",
  "resumoJuridico": "## Análise Jurídica\\n\\nTexto COMPLETO e DETALHADO em Markdown. Deve incluir:\\n1. Identificação de todas as pessoas (nome, CPF, qualificação, estado civil)\\n2. Se algum ex-mutuário for casado: analisar necessidade de outorga conjugal e riscos do cônjuge\\n3. Processos ou ações judiciais mencionados na matrícula\\n4. Riscos jurídicos identificados com análise fundamentada\\n5. Recomendações específicas para o arrematante\\n\\nUse cabeçalhos (##, ###), negrito para dados críticos.",
  "parecerFinal": "## Parecer Final do Especialista\\n\\nTexto objetivo e direto. Deve conter:\\n1. **Conclusão geral**: a situação jurídica/registral do imóvel é REGULAR, IRREGULAR ou CRÍTICA e por quê\\n2. **Pontos de atenção prioritários**: liste em ordem de importância os 2-3 principais riscos\\n3. **Recomendação de compra**: RECOMENDADO, RECOMENDADO COM RESSALVAS ou NÃO RECOMENDADO — com justificativa técnica\\n4. **Próximos passos**: o que o arrematante deve fazer antes e após a arrematação\\n\\nSeja direto e assertivo como um especialista que assina o laudo.",
  "limitacoes": ["array de strings — o que não foi possível verificar, estava ilegível ou requer confirmação externa"]
}

REGRAS TÉCNICAS OBRIGATÓRIAS:
- Nunca invente dados. Se não encontrar, use null.
- CPF: extraia exatamente como aparece no documento (formato XXX.XXX.XXX-XX).
- Inclua TODOS os atos registrais sem exceção (R-1, R-2, AV-1, AV-2, AV-3, etc.).
- Estado civil: procure termos como "casado", "solteiro", "divorciado", "viúvo", "outorga conjugal" em qualquer ato da matrícula.
- Cônjuge: se a matrícula mencionar cônjuge em qualquer ato, extraia dados em conjugeNome e conjugeCpf.
- Alertas: critico = impede compra; alto = risco significativo; medio = verificar; baixo = informativo.
- Gravames: só classifique como "cancelado" se houver ato de cancelamento explícito na matrícula.
- CRUZAMENTO COM DADOS DA CAIXA: Quando os "Dados atuais do site da Caixa" forem fornecidos acima, cruze-os obrigatoriamente com a matrícula. Divergências geram alerta específico. Nunca omita divergências.`;

console.log(`\n[1/2] Chamando Claude API para análise de matrícula...`);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const response = await anthropic.messages.create({
  model: "claude-opus-5-5",
  max_tokens: 16384,
  messages: [{
    role: "user",
    content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBuffer.toString("base64") } },
      { type: "text", text: prompt },
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
catch { console.error("❌ Falha no parse JSON:\n", text.slice(0, 400)); await mongoClient.close(); process.exit(1); }

console.log(`\nMatrícula: ${analise.numeroMatricula} — ${analise.titularAtual?.slice(0, 60)}`);
console.log(`Alertas: ${analise.alertas?.length ?? 0}`);
analise.alertas?.forEach(a => console.log(`  [${a.gravidade.toUpperCase()}] ${a.descricao?.slice(0, 100)}`));
console.log(`Pessoas: ${analise.pessoas?.length ?? 0}`);
analise.pessoas?.forEach(p => console.log(`  ${p.nome} — CPF: ${p.cpf ?? "sem CPF"} (${p.qualificacao})`));

// ─── ETAPA 2: PESQUISA JURÍDICA ──────────────────────────────────────────────

const pessoasComCpf = (analise.pessoas ?? []).filter(p => p.cpf);
console.log(`\n[2/2] Pesquisa jurídica para ${pessoasComCpf.length} pessoa(s) com CPF...`);

const BASE_CDP = "https://consultadeprocessos.com.br/api/partner/v2";
const cdpHeaders = {
  Authorization: `Bearer ${process.env.CONSULTADEPROCESSOS_API_KEY}`,
  "Content-Type": "application/json",
};

function soNumeros(doc) { return doc.replace(/\D/g, ""); }

const resultadosPesquisa = [];

for (const pessoa of pessoasComCpf) {
  const doc = soNumeros(pessoa.cpf);
  console.log(`\n  Consultando: ${pessoa.nome} (${pessoa.cpf})`);

  try {
    const criacao = await fetch(`${BASE_CDP}/lawsuits/document`, {
      method: "POST", headers: cdpHeaders,
      body: JSON.stringify({ document: doc }),
    });
    if (!criacao.ok) {
      console.log(`  ❌ HTTP ${criacao.status}`);
      resultadosPesquisa.push({ cpfCnpj: pessoa.cpf, nome: pessoa.nome, total: 0, processos: [], totaisTribunal: {}, totaisPolo: {}, erro: `HTTP ${criacao.status}` });
      continue;
    }
    const { requestId } = await criacao.json();
    console.log(`  requestId: ${requestId}`);

    // Polling
    let resultado = null;
    const limite = Date.now() + 60_000;
    while (Date.now() < limite) {
      await new Promise(r => setTimeout(r, 2500));
      const poll = await fetch(`${BASE_CDP}/lawsuits/document/${requestId}?perPage=100&includeAiSummary=true`, { headers: cdpHeaders });
      if (poll.ok) {
        resultado = await poll.json();
        process.stdout.write(`  status: ${resultado.status}...`);
        if (resultado.status === "done" || resultado.status === "error") { process.stdout.write("\n"); break; }
      }
    }

    if (!resultado || resultado.status !== "done") {
      resultadosPesquisa.push({ cpfCnpj: pessoa.cpf, nome: pessoa.nome, total: 0, processos: [], totaisTribunal: {}, totaisPolo: {}, erro: "Timeout" });
      continue;
    }

    console.log(`  ✅ ${resultado.total} processo(s) encontrado(s)`);
    if (resultado.courtTypeTotals) {
      Object.entries(resultado.courtTypeTotals).forEach(([k, v]) => v > 0 && console.log(`     ${k}: ${v}`));
    }
    resultadosPesquisa.push({
      cpfCnpj: pessoa.cpf, nome: pessoa.nome,
      total: resultado.total ?? 0,
      processos: resultado.lawsuits ?? [],
      totaisTribunal: resultado.courtTypeTotals ?? {},
      totaisPolo: resultado.polarityTotals ?? {},
    });
  } catch (e) {
    console.log(`  ❌ Erro: ${e.message}`);
    resultadosPesquisa.push({ cpfCnpj: pessoa.cpf, nome: pessoa.nome, total: 0, processos: [], totaisTribunal: {}, totaisPolo: {}, erro: e.message });
  }
}

// ─── FORMATAÇÃO DO MARKDOWN DE PESQUISA ─────────────────────────────────────

function formatarPesquisa(resultados) {
  const linhas = ["## Pesquisa de Processos Judiciais\n"];
  for (const r of resultados) {
    linhas.push(`### ${r.nome}`);
    linhas.push(`**CPF/CNPJ:** ${r.cpfCnpj}\n`);
    if (r.erro) { linhas.push(`> ⚠️ Erro: ${r.erro}\n`); continue; }
    if (r.total === 0) { linhas.push(`**Resultado:** Nenhum processo encontrado.\n`); continue; }
    linhas.push(`**Total:** ${r.total} processo(s)`);
    const tribunais = Object.entries(r.totaisTribunal).filter(([,v]) => v > 0).map(([k,v]) => `${k}: ${v}`).join(" · ");
    if (tribunais) linhas.push(`**Por área:** ${tribunais}`);
    const polos = Object.entries(r.totaisPolo).filter(([,v]) => v > 0)
      .map(([k,v]) => `${k === "ACTIVE" ? "Autor" : k === "PASSIVE" ? "Réu" : "Neutro"}: ${v}`).join(" · ");
    if (polos) linhas.push(`**Por polo:** ${polos}\n`);
    for (const p of r.processos.slice(0, 10)) {
      const data = p.lastMovementDate ? new Date(p.lastMovementDate).toLocaleDateString("pt-BR") : "–";
      const polo = p.documentPolarity === "ACTIVE" ? "**Autor**" : p.documentPolarity === "PASSIVE" ? "**Réu**" : "Neutro";
      linhas.push(`**${p.number}**`);
      linhas.push(`- ${p.courtType ?? "–"} · ${p.courtName ?? "–"}/${p.state ?? ""}`);
      linhas.push(`- Assunto: ${p.mainSubject ?? "–"} · Polo: ${polo} · Status: ${p.status ?? "–"} · Última mov.: ${data}`);
      if (p.aiSummary) linhas.push(`- IA: ${p.aiSummary}`);
      linhas.push("");
    }
    if (r.total > 10) linhas.push(`_... e mais ${r.total - 10} processo(s)._\n`);
  }
  return linhas.join("\n");
}

const markdownPesquisa = formatarPesquisa(resultadosPesquisa);

// ─── SALVA NO BANCO ──────────────────────────────────────────────────────────

const agora = new Date().toISOString();
const { resumoMatricula, resumoJuridico, parecerFinal, ...analiseJson } = analise;

const conteudoJuridica = (resumoJuridico ?? "") + "\n\n---\n\n" + markdownPesquisa;

const novaEntradaIA = { tipo: "matricula", modelo: "claude-opus-5-5", inputTokens: input_tokens, outputTokens: output_tokens, custoUSD, em: agora };

await db.collection("laudos").updateOne(
  { _id: new ObjectId(laudoId) },
  {
    $set: {
      ...(matriculaPdfR2Url ? { matriculaPdfR2Url } : {}),
      analiseMatriculaJson: analiseJson,
      pesquisaJuridicaEm: agora,
      "blocos.matricula": { status: "concluido", conteudo: resumoMatricula, atualizadoEm: agora },
      "blocos.juridica":  { status: "concluido", conteudo: conteudoJuridica, atualizadoEm: agora },
      "blocos.parecer":   { status: "concluido", conteudo: parecerFinal,     atualizadoEm: agora },
      atualizadoEm: agora,
    },
    $push: { analisesIA: novaEntradaIA },
  }
);

console.log(`\n✅ Laudo atualizado com análise completa + pesquisa jurídica.`);
console.log(`   Custo análise matrícula: US$ ${custoUSD.toFixed(4)} (≈ R$ ${(custoUSD * 5.5).toFixed(2)})`);

await mongoClient.close();
