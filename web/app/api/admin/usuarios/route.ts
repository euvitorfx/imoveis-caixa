import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const client = await clientPromise;
  const col = client.db(process.env.MONGODB_DB).collection("users");

  const analises = client.db(process.env.MONGODB_DB).collection("analises_viabilidade");

  const corretores = client.db(process.env.MONGODB_DB).collection("corretores");

  const [total, premium, comTelefone, recentes, contagemAnalises, corretoresComUserId] = await Promise.all([
    col.countDocuments({}),
    col.countDocuments({ plano: "premium" }),
    col.countDocuments({ telefone: { $nin: [null, ""] } }),
    col.find({})
      .sort({ criadoEm: -1 })
      .limit(200)
      .project({ _id: 1, name: 1, email: 1, telefone: 1, plano: 1, criadoEm: 1, preferencias: 1, favoritos: 1, totalSessoes: 1, totalPageviews: 1, ultimoAcesso: 1, isAfiliado: 1, afiliadoId: 1 })
      .toArray(),
    analises.aggregate([
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]).toArray(),
    corretores.find({ userId: { $exists: true, $ne: null } }, { projection: { userId: 1 } }).toArray(),
  ]);

  const analisesPorUser = Object.fromEntries(contagemAnalises.map((r) => [r._id, r.count]));
  const corretorPorUserId = Object.fromEntries(
    corretoresComUserId.map((c) => [c.userId as string, c._id.toString()])
  );

  return NextResponse.json({
    total,
    premium,
    comTelefone,
    gratuito: total - premium,
    recentes: recentes.map((u) => {
      const uid = u._id.toString();
      return {
        ...u,
        _id: uid,
        totalFavoritos: Array.isArray(u.favoritos) ? u.favoritos.length : 0,
        totalAnalises: analisesPorUser[uid] ?? 0,
        isAfiliado: u.isAfiliado ?? false,
        afiliadoId: u.afiliadoId ?? null,
        isCorretor: !!corretorPorUserId[uid],
        corretorId: corretorPorUserId[uid] ?? null,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { nome, email, telefone, plano, senha } = await req.json();
  if (!nome || !email || !senha)
    return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios" }, { status: 400 });

  const client = await clientPromise;
  const col = client.db(process.env.MONGODB_DB).collection("users");

  if (await col.findOne({ email: email.toLowerCase() }))
    return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });

  const senhaHash = await bcrypt.hash(senha, 12);
  await col.insertOne({
    name: nome,
    email: email.toLowerCase(),
    emailVerified: null,
    senhaHash,
    telefone: telefone || null,
    plano: plano || "gratuito",
    favoritos: [],
    criadoEm: new Date(),
  });

  return NextResponse.json({ ok: true });
}
