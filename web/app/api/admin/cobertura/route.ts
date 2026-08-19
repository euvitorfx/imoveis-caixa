import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const [cidadesBase, imoveisAtivos, corretores, allCorretores] = await Promise.all([
    // Todas as cidades já vistas (coleção persistente — não depende de imóveis ativos)
    db.collection("cidades_caixa")
      .find({}, { projection: { uf: 1, cidade: 1 } })
      .sort({ uf: 1, cidade: 1 })
      .toArray(),

    // Contagem de imóveis ativos por cidade
    db.collection(process.env.MONGODB_COLLECTION!)
      .aggregate([
        { $match: { ativo: true } },
        { $group: { _id: { uf: "$estado", cidade: "$cidade" }, qtd: { $sum: 1 } } },
      ])
      .toArray(),

    // Parceiros com cidades de cobertura
    db.collection("corretores")
      .find(
        { cidades_cobertura: { $exists: true, $ne: [] } },
        { projection: { nome: 1, creci: 1, status_relacionamento: 1, cidades_cobertura: 1 } }
      )
      .toArray(),

    // Todos os parceiros para o resumo por status
    db.collection("corretores")
      .find({}, { projection: { status_relacionamento: 1 } })
      .toArray(),
  ]);

  // Map: "UF|CIDADE" → qtd imóveis ativos
  const ativosMap = new Map<string, number>();
  for (const row of imoveisAtivos) {
    ativosMap.set(`${row._id.uf}|${row._id.cidade}`, row.qtd as number);
  }

  // Map: "UF|CIDADE" → parceiro responsável
  const coberturaMap = new Map<string, { nome: string; creci: string; status: string }>();
  for (const c of corretores) {
    for (const cc of c.cidades_cobertura ?? []) {
      coberturaMap.set(`${cc.uf}|${cc.cidade}`, {
        nome:   c.nome,
        creci:  c.creci,
        status: c.status_relacionamento ?? "sem_resposta",
      });
    }
  }

  // Lista final de cidades
  const cidades = cidadesBase.map((c) => {
    const key     = `${c.uf}|${c.cidade}`;
    const parceiro = coberturaMap.get(key) ?? null;
    return {
      uf:         c.uf as string,
      cidade:     c.cidade as string,
      qtdImoveis: ativosMap.get(key) ?? 0,
      coberta:    parceiro !== null,
      parceiro,
    };
  });

  const totalImoveis      = cidades.reduce((s, c) => s + c.qtdImoveis, 0);
  const cidadesCobertas   = cidades.filter((c) => c.coberta).length;
  const cidadesDisponiveis = cidades.length - cidadesCobertas;

  const parceirosPorStatus = allCorretores.reduce<Record<string, number>>((acc, c) => {
    const s = c.status_relacionamento ?? "sem_resposta";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    resumo: {
      totalParceiros: allCorretores.length,
      parceirosPorStatus,
      totalCidades:     cidades.length,
      cidadesCobertas,
      cidadesDisponiveis,
      coberturaPct: cidades.length > 0 ? cidadesCobertas / cidades.length : 0,
      totalImoveis,
    },
    cidades,
  });
}
