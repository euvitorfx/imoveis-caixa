import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createLaudo,
  getLaudosByUser,
  getLaudosAdmin,
  blocoVazio,
  PRECOS,
} from "@/lib/laudos";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET /api/laudos — lista laudos do usuário logado (ou todos para admin)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const admin = url.searchParams.get("admin") === "1";

  if (admin) {
    const token = req.cookies.get("admin_token")?.value;
    if (!token || token !== process.env.ADMIN_SECRET)
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    const laudos = await getLaudosAdmin();

    // Enriquecer com telefone dos usuários para follow-up
    const userIds = [...new Set(laudos.map((l) => l.userId).filter(Boolean))];
    const usersCol = (await clientPromise).db(process.env.MONGODB_DB).collection("users");
    const users = await usersCol
      .find({ _id: { $in: userIds.map((id) => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) as ObjectId[] } })
      .project({ _id: 1, telefone: 1, name: 1 })
      .toArray();
    const phoneMap = Object.fromEntries(users.map((u) => [u._id.toString(), u.telefone ?? null]));

    const enriched = laudos.map((l) => ({ ...l, userPhone: phoneMap[l.userId] ?? null }));
    return NextResponse.json(enriched);
  }

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const laudos = await getLaudosByUser(session.user.id);
  return NextResponse.json(laudos);
}

// POST /api/laudos — cria um pedido de laudo (antes do pagamento)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { imovelId, nivel } = body;

  if (!imovelId) return NextResponse.json({ error: "imovelId obrigatório" }, { status: 400 });
  if (nivel !== 1 && nivel !== 2) return NextResponse.json({ error: "nivel deve ser 1 ou 2" }, { status: 400 });

  // Buscar dados do imóvel para snapshot
  const client = await clientPromise;
  const col = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);
  let imovelDoc = await col.findOne({ hdnImovel: imovelId });
  if (!imovelDoc && ObjectId.isValid(imovelId)) {
    imovelDoc = await col.findOne({ _id: new ObjectId(imovelId) });
  }

  const imovelDescricao = imovelDoc
    ? `${imovelDoc.tipo || "Imóvel"} em ${imovelDoc.cidade}/${imovelDoc.estado}`
    : `Imóvel ${imovelId}`;

  const now = new Date().toISOString();
  const id = await createLaudo({
    userId: session.user.id,
    userEmail: session.user.email ?? "",
    userName: session.user.name ?? "",
    imovelId,
    imovelDescricao,
    imovelData: imovelDoc ? { ...imovelDoc, _id: imovelDoc._id.toString() } : {},
    nivel: nivel as 1 | 2,
    preco: PRECOS[nivel as 1 | 2],
    status: "aguardando_pagamento",
    criadoEm: now,
    atualizadoEm: now,
    blocos: {
      mercado:     blocoVazio(),
      matricula:   blocoVazio(),
      juridica:    blocoVazio(),
      viabilidade: blocoVazio(),
    },
  });

  return NextResponse.json({ id }, { status: 201 });
}
