import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const users = db.collection("users");
  const analises = db.collection("analises_viabilidade");

  const hoje = startOfToday();
  const ontem = daysAgo(1);
  const ago7 = daysAgo(7);
  const ago15 = daysAgo(15);
  const ago30 = daysAgo(30);

  const [
    novosHoje, novosOntem, novos7, novos15, novos30,
    ativosHoje, ativosOntem, ativos7, ativos15, ativos30,
    anHoje, anOntem, an7, an15, an30,
    comFavoritos,
    cadastrosPorDia, analisesPorDia,
  ] = await Promise.all([
    // Novos cadastros — criadoEm é Date
    users.countDocuments({ criadoEm: { $gte: hoje } }),
    users.countDocuments({ criadoEm: { $gte: ontem, $lt: hoje } }),
    users.countDocuments({ criadoEm: { $gte: ago7 } }),
    users.countDocuments({ criadoEm: { $gte: ago15 } }),
    users.countDocuments({ criadoEm: { $gte: ago30 } }),
    // Usuários ativos — ultimoAcesso é ISO string
    users.countDocuments({ ultimoAcesso: { $gte: hoje.toISOString() } }),
    users.countDocuments({ ultimoAcesso: { $gte: ontem.toISOString(), $lt: hoje.toISOString() } }),
    users.countDocuments({ ultimoAcesso: { $gte: ago7.toISOString() } }),
    users.countDocuments({ ultimoAcesso: { $gte: ago15.toISOString() } }),
    users.countDocuments({ ultimoAcesso: { $gte: ago30.toISOString() } }),
    // Planilhas criadas — criadaEm é Date
    analises.countDocuments({ criadaEm: { $gte: hoje } }),
    analises.countDocuments({ criadaEm: { $gte: ontem, $lt: hoje } }),
    analises.countDocuments({ criadaEm: { $gte: ago7 } }),
    analises.countDocuments({ criadaEm: { $gte: ago15 } }),
    analises.countDocuments({ criadaEm: { $gte: ago30 } }),
    // Usuários com pelo menos 1 favorito
    users.countDocuments({ favoritos: { $exists: true, $not: { $size: 0 } } }),
    // Cadastros por dia (últimos 30 dias)
    users.aggregate([
      { $match: { criadoEm: { $gte: ago30 } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$criadoEm" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    // Planilhas por dia (últimos 30 dias)
    analises.aggregate([
      { $match: { criadaEm: { $gte: ago30 } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$criadaEm" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
  ]);

  return NextResponse.json({
    cadastros: { hoje: novosHoje, ontem: novosOntem, "7d": novos7, "15d": novos15, "30d": novos30 },
    ativos: { hoje: ativosHoje, ontem: ativosOntem, "7d": ativos7, "15d": ativos15, "30d": ativos30 },
    planilhas: { hoje: anHoje, ontem: anOntem, "7d": an7, "15d": an15, "30d": an30 },
    comFavoritos,
    cadastrosPorDia: cadastrosPorDia.map((d) => ({ dia: d._id as string, count: d.count as number })),
    analisesPorDia: analisesPorDia.map((d) => ({ dia: d._id as string, count: d.count as number })),
  });
}
