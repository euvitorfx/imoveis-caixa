import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

function startOf(unit: "day" | "week" | "month") {
  const d = new Date();
  if (unit === "day") {
    d.setHours(0, 0, 0, 0);
  } else if (unit === "week") {
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const hoje   = startOf("day");
  const semana = startOf("week");
  const mes    = startOf("month");

  const [
    usersTotal, usersPremium, usersComTelefone,
    usersHoje, usersSemana, usersMes,
    usersRecentes,
    imoveisTotal,
    viewsTotal, viewsHoje, viewsSemana,
    clicksTotal, clicksHoje, clicksSemana,
    laudosAll,
    emailEnviados,
    emailAberturas,
    eventosRecentes,
  ] = await Promise.all([
    // Usuários
    db.collection("users").countDocuments({}),
    db.collection("users").countDocuments({ plano: "premium" }),
    db.collection("users").countDocuments({ telefone: { $nin: [null, ""] } }),
    db.collection("users").countDocuments({ criadoEm: { $gte: hoje } }),
    db.collection("users").countDocuments({ criadoEm: { $gte: semana } }),
    db.collection("users").countDocuments({ criadoEm: { $gte: mes } }),
    db.collection("users")
      .find({})
      .sort({ criadoEm: -1 })
      .limit(8)
      .project({ _id: 0, name: 1, email: 1, plano: 1, criadoEm: 1, telefone: 1 })
      .toArray(),

    // Imóveis
    db.collection("imoveis").countDocuments({}),

    // Funil views
    db.collection("eventos_laudo").countDocuments({ tipo: "visualizou_botao" }),
    db.collection("eventos_laudo").countDocuments({ tipo: "visualizou_botao", criadoEm: { $gte: hoje } }),
    db.collection("eventos_laudo").countDocuments({ tipo: "visualizou_botao", criadoEm: { $gte: semana } }),

    // Funil clicks
    db.collection("eventos_laudo").countDocuments({ tipo: "clicou_plano" }),
    db.collection("eventos_laudo").countDocuments({ tipo: "clicou_plano", criadoEm: { $gte: hoje } }),
    db.collection("eventos_laudo").countDocuments({ tipo: "clicou_plano", criadoEm: { $gte: semana } }),

    // Laudos
    db.collection("laudos").find({}).project({ status: 1, preco: 1, nivel: 1, paidAt: 1, criadoEm: 1 }).toArray(),

    // E-mail
    db.collection("users").countDocuments({ laudoBLCEmailEnviado: true }),
    db.collection("email_opens").countDocuments({ campanhaId: "laudo-blc-01" }),

    // Eventos recentes (últimos 30)
    db.collection("eventos_laudo")
      .find({})
      .sort({ criadoEm: -1 })
      .limit(30)
      .toArray(),
  ]);

  const laudosAgrupados = {
    total:        laudosAll.filter((l) => l.status !== "cancelado").length,
    aguardando:   laudosAll.filter((l) => l.status === "aguardando_pagamento").length,
    pagos:        laudosAll.filter((l) => l.status === "pago").length,
    em_producao:  laudosAll.filter((l) => l.status === "em_producao").length,
    entregues:    laudosAll.filter((l) => l.status === "entregue").length,
    cancelados:   laudosAll.filter((l) => l.status === "cancelado").length,
    receita:      laudosAll
      .filter((l) => !["aguardando_pagamento", "cancelado"].includes(l.status))
      .reduce((s, l) => s + (l.preco ?? 0), 0),
  };

  return NextResponse.json({
    atualizado: new Date().toISOString(),
    usuarios: {
      total:        usersTotal,
      premium:      usersPremium,
      gratuito:     usersTotal - usersPremium,
      comTelefone:  usersComTelefone,
      hoje:         usersHoje,
      semana:       usersSemana,
      mes:          usersMes,
      recentes:     usersRecentes,
    },
    imoveis: { total: imoveisTotal },
    funil: {
      views:  { total: viewsTotal,  hoje: viewsHoje,  semana: viewsSemana },
      clicks: { total: clicksTotal, hoje: clicksHoje, semana: clicksSemana },
    },
    laudos: laudosAgrupados,
    email: {
      enviados:   emailEnviados,
      aberturas:  emailAberturas,
      taxa:       emailEnviados > 0 ? +(emailAberturas / emailEnviados * 100).toFixed(1) : 0,
    },
    eventosRecentes: eventosRecentes.map((e) => ({
      tipo:   e.tipo,
      quem:   e.userEmail ?? (e.anonId ? `anon:${String(e.anonId).slice(-6)}` : "?"),
      logado: !!e.userId,
      nivel:  e.nivel ?? null,
      imovel: e.imovelId ? String(e.imovelId).slice(0, 12) : null,
      em:     e.criadoEm,
    })),
  });
}
