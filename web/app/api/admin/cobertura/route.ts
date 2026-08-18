import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  // Parallel: property counts per city + all partners with their cities
  const [imoveisPorCidade, corretores] = await Promise.all([
    db
      .collection(process.env.MONGODB_COLLECTION!)
      .aggregate([
        { $match: { ativo: true } },
        { $group: { _id: { uf: "$estado", cidade: "$cidade" }, qtd: { $sum: 1 } } },
        { $sort: { "_id.uf": 1, "_id.cidade": 1 } },
      ])
      .toArray(),
    db
      .collection("corretores")
      .find(
        { cidades_cobertura: { $exists: true, $ne: [] } },
        { projection: { nome: 1, creci: 1, status_relacionamento: 1, cidades_cobertura: 1 } }
      )
      .toArray(),
  ]);

  // Build coverage map: "UF|CIDADE" → { corretorNome, corretorId, status }
  const coberturaMap = new Map<string, { nome: string; creci: string; status: string }>();
  for (const c of corretores) {
    for (const cc of c.cidades_cobertura ?? []) {
      const key = `${cc.uf}|${cc.cidade}`;
      coberturaMap.set(key, {
        nome: c.nome,
        creci: c.creci,
        status: c.status_relacionamento ?? "sem_resposta",
      });
    }
  }

  // Build city list
  const cidades = imoveisPorCidade.map((row) => {
    const key = `${row._id.uf}|${row._id.cidade}`;
    const parceiro = coberturaMap.get(key) ?? null;
    return {
      uf: row._id.uf as string,
      cidade: row._id.cidade as string,
      qtdImoveis: row.qtd as number,
      coberta: parceiro !== null,
      parceiro,
    };
  });

  const totalImoveis = cidades.reduce((s, c) => s + c.qtdImoveis, 0);
  const cidadesCobertas = cidades.filter((c) => c.coberta).length;
  const cidadesDisponiveis = cidades.length - cidadesCobertas;

  // Partner summary by status
  const allCorretores = await db
    .collection("corretores")
    .find({}, { projection: { status_relacionamento: 1 } })
    .toArray();

  const parceirosPorStatus = allCorretores.reduce<Record<string, number>>((acc, c) => {
    const s = c.status_relacionamento ?? "sem_resposta";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    resumo: {
      totalParceiros: allCorretores.length,
      parceirosPorStatus,
      totalCidades: cidades.length,
      cidadesCobertas,
      cidadesDisponiveis,
      coberturaPct: cidades.length > 0 ? cidadesCobertas / cidades.length : 0,
      totalImoveis,
    },
    cidades,
  });
}
