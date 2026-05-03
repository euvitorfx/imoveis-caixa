import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const col = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);

    const [
      total,
      porEstado,
      porTipo,
      porModalidade,
      comDesconto30,
      aceitaFinanciamento,
      semGeocode,
    ] = await Promise.all([
      col.countDocuments({ ativo: true }),

      col.aggregate([
        { $match: { ativo: true } },
        {
          $group: {
            _id: "$estado",
            total: { $sum: 1 },
            precoMedio: { $avg: "$preco" },
            precoMin: { $min: "$preco" },
            precoMax: { $max: "$preco" },
          },
        },
        { $sort: { total: -1 } },
      ]).toArray(),

      col.aggregate([
        { $match: { ativo: true, tipo: { $exists: true, $ne: null } } },
        { $group: { _id: "$tipo", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]).toArray(),

      col.aggregate([
        { $match: { ativo: true, modalidade: { $exists: true, $ne: null } } },
        { $group: { _id: "$modalidade", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]).toArray(),

      col.countDocuments({
        ativo: true,
        $expr: {
          $gte: [{ $subtract: [1, { $divide: ["$preco", "$precoAval"] }] }, 0.3],
        },
      }),

      col.countDocuments({
        ativo: true,
        financiamento: { $regex: "sim", $options: "i" },
      }),

      col.countDocuments({ ativo: true, lat: { $exists: false } }),
    ]);

    return NextResponse.json({
      total,
      porEstado,
      porTipo,
      porModalidade,
      comDesconto30,
      aceitaFinanciamento,
      semGeocode,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
