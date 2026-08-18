import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createProcesso, getProcessosByUser } from "@/lib/processos-clube";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const processos = await getProcessosByUser(session.user.id);
  return NextResponse.json(processos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { creci, numeroProcessoCaixa, imovelNumero, imovelDescricao, imovelId } = await req.json();

  if (!creci?.trim())
    return NextResponse.json({ error: "CRECI obrigatório" }, { status: 400 });
  if (!numeroProcessoCaixa?.trim())
    return NextResponse.json({ error: "Número do processo obrigatório" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  // Find corretor by CRECI (case-insensitive)
  const escaped = creci.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const corretor = await db
    .collection("corretores")
    .findOne(
      { creci: { $regex: new RegExp(`^${escaped}$`, "i") } },
      { projection: { _id: 1, nome: 1 } }
    );

  if (!corretor)
    return NextResponse.json(
      { error: "CRECI não encontrado em nossa base de assessores parceiros" },
      { status: 404 }
    );

  // No duplicate: same user + same numeroProcessoCaixa
  const existing = await db
    .collection("processos_clube")
    .findOne({ userId: session.user.id, numeroProcessoCaixa: numeroProcessoCaixa.trim() });

  if (existing)
    return NextResponse.json(
      { error: "Já existe um processo com esse número cadastrado" },
      { status: 409 }
    );

  const id = await createProcesso({
    userId: session.user.id,
    corretorId: corretor._id.toString(),
    imovelId: imovelId ?? undefined,
    imovelNumero: imovelNumero?.trim() || undefined,
    imovelDescricao: imovelDescricao?.trim() || undefined,
    numeroProcessoCaixa: numeroProcessoCaixa.trim(),
    status: "em_analise",
    abertoPor: "comprador",
  });

  return NextResponse.json({ ok: true, id, corretorNome: corretor.nome });
}
