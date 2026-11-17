/**
 * Cria um laudo de teste com status "pago" para fins de desenvolvimento.
 * Uso: node scripts/criar-laudo-teste.mjs <hdnImovel>
 * Exemplo: node scripts/criar-laudo-teste.mjs 8555530858846
 *
 * Para deletar depois: node scripts/criar-laudo-teste.mjs --deletar <laudoId>
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

const args = process.argv.slice(2);
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB);

// --- DELETAR ---
if (args[0] === "--deletar") {
  const id = args[1];
  if (!id || !ObjectId.isValid(id)) {
    console.error("Uso: node scripts/criar-laudo-teste.mjs --deletar <laudoId>");
    await client.close(); process.exit(1);
  }
  const res = await db.collection("laudos").deleteOne({ _id: new ObjectId(id) });
  console.log(res.deletedCount === 1 ? `✅ Laudo ${id} deletado.` : `❌ Laudo ${id} não encontrado.`);
  await client.close(); process.exit(0);
}

// --- CRIAR ---
const hdnImovel = args[0];
if (!hdnImovel) {
  console.error("Uso: node scripts/criar-laudo-teste.mjs <hdnImovel>");
  await client.close(); process.exit(1);
}

// Busca o imóvel
const imovel = await db.collection("imoveis").findOne({ hdnImovel });
if (!imovel) {
  console.error(`❌ Imóvel com hdnImovel "${hdnImovel}" não encontrado.`);
  await client.close(); process.exit(1);
}

// Busca o usuário pelo email
const usuario = await db.collection("users").findOne({ email: "vitorvalenca1@gmail.com" });
if (!usuario) {
  console.error("❌ Usuário não encontrado. Verifique o email no script.");
  await client.close(); process.exit(1);
}

// Próximo número de laudo
const counter = await db.collection("counters").findOneAndUpdate(
  { _id: "laudos" },
  { $inc: { seq: 1 } },
  { upsert: true, returnDocument: "after" }
);
const numero = counter?.seq ?? 1;

const agora = new Date().toISOString();
const laudo = {
  userId: usuario._id.toString(),
  userEmail: usuario.email,
  userName: usuario.name ?? "Vitor",
  imovelId: imovel._id.toString(),
  imovelDescricao: `${imovel.tipo ?? "Imóvel"} em ${imovel.cidade}/${imovel.estado ?? imovel.uf}`,
  imovelData: {
    hdnImovel: imovel.hdnImovel,
    cidade: imovel.cidade,
    uf: imovel.estado ?? imovel.uf,
    tipo: imovel.tipo,
    preco: imovel.preco,
    matriculaUrl: imovel.matriculaUrl,
    ocupacao: imovel.ocupacao,
    modalidade: imovel.modalidade,
  },
  nivel: 2,
  preco: 29700,
  status: "pago",
  numero,
  paidAt: agora,
  criadoEm: agora,
  atualizadoEm: agora,
  blocos: {
    mercado:     { status: "pendente" },
    matricula:   { status: "pendente" },
    juridica:    { status: "pendente" },
    viabilidade: { status: "pendente" },
  },
  _teste: true,
};

const result = await db.collection("laudos").insertOne(laudo);
const laudoId = result.insertedId.toString();

console.log(`\n✅ Laudo de teste criado!\n`);
console.log(`   ID     : ${laudoId}`);
console.log(`   Número : #${String(numero).padStart(4, "0")}`);
console.log(`   Imóvel : ${laudo.imovelDescricao}`);
console.log(`   Status : pago\n`);
console.log(`   Admin  : http://localhost:3001/admin/laudos`);
console.log(`   Análise: http://localhost:3001/admin/laudos/${laudoId}/analise\n`);
console.log(`   Para deletar depois:`);
console.log(`   node scripts/criar-laudo-teste.mjs --deletar ${laudoId}\n`);

await client.close();
