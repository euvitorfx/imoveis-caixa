import { NextRequest, NextResponse } from "next/server";
import { getAllProcessos, createProcesso } from "@/lib/processos-clube";
import clientPromise from "@/lib/mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const processos = await getAllProcessos();
  return NextResponse.json(processos);
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { emailComprador, creci, numeroProcessoCaixa, imovelNumero, imovelDescricao, status } = await req.json();

  if (!emailComprador || !creci || !numeroProcessoCaixa) {
    return NextResponse.json({ error: "E-mail do comprador, CRECI e número do processo são obrigatórios." }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  // Busca comprador pelo e-mail
  const user = await db.collection("users").findOne(
    { email: { $regex: new RegExp(`^${emailComprador.trim()}$`, "i") } },
    { projection: { _id: 1, name: 1 } }
  );
  if (!user) return NextResponse.json({ error: "Usuário não encontrado com esse e-mail." }, { status: 404 });

  // Busca corretor pelo CRECI
  const corretor = await db.collection("corretores").findOne(
    { creci: { $regex: new RegExp(`^${creci.trim()}$`, "i") } },
    { projection: { _id: 1, nome: 1 } }
  );
  if (!corretor) return NextResponse.json({ error: "Assessor não encontrado com esse CRECI." }, { status: 404 });

  // Verifica duplicidade
  const existe = await db.collection("processos_clube").findOne({
    userId: user._id.toString(),
    corretorId: corretor._id.toString(),
    numeroProcessoCaixa: numeroProcessoCaixa.trim(),
  });
  if (existe) return NextResponse.json({ error: "Já existe um processo com esses dados." }, { status: 409 });

  const id = await createProcesso({
    userId:              user._id.toString(),
    corretorId:          corretor._id.toString(),
    numeroProcessoCaixa: numeroProcessoCaixa.trim(),
    imovelNumero:        imovelNumero?.trim() || undefined,
    imovelDescricao:     imovelDescricao?.trim() || undefined,
    status:              status || "aguardando_dados",
    abertoPor:           "corretor",
  });

  return NextResponse.json({ id, compradorNome: user.name, corretorNome: corretor.nome });
}
