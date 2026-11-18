import { MongoClient } from "mongodb";

const uri = "mongodb://admin:%40Acesso00@ac-jmn2ibr-shard-00-00.98n0hxa.mongodb.net:27017,ac-jmn2ibr-shard-00-01.98n0hxa.mongodb.net:27017,ac-jmn2ibr-shard-00-02.98n0hxa.mongodb.net:27017/?ssl=true&replicaSet=atlas-pjrbdp-shard-0&authSource=admin&appName=imoveis-caixa";

console.log("Conectando ao MongoDB via Node.js...");
const start = Date.now();

try {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const col = client.db("imoveis_caixa").collection("imoveis");
  const total = await col.countDocuments({ ativo: true });
  console.log(`✅ Conectado em ${Date.now() - start}ms`);
  console.log(`✅ Total de imóveis ativos: ${total}`);
  await client.close();
} catch (err) {
  console.error(`❌ Erro após ${Date.now() - start}ms:`);
  console.error(err.message);
}
