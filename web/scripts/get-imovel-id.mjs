import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { resolve } from "path";
function loadEnv(p){try{for(const l of readFileSync(p,"utf-8").split("\n")){const t=l.trim();if(!t||t.startsWith("#"))continue;const eq=t.indexOf("=");if(eq===-1)continue;const k=t.slice(0,eq).trim(),v=t.slice(eq+1).trim();if(!process.env[k])process.env[k]=v;}}catch{}}
loadEnv(resolve("web/.env.local"));
const c=new MongoClient(process.env.MONGODB_URI);
await c.connect();
const db=c.db(process.env.MONGODB_DB);
const ev=await db.collection("eventos_laudo").find({tipo:"visualizou_botao"}).sort({criadoEm:-1}).limit(1).toArray();
console.log(ev[0]?.imovelId);
await c.close();
