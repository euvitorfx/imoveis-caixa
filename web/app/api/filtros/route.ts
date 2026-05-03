import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const estado = searchParams.get("estado") || "";

  try {
    const client = await clientPromise;
    const col    = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);

    const matchStage = estado
      ? { $match: { ativo: true, estado: estado.toUpperCase() } }
      : { $match: { ativo: true } };

    const [cidades, tipos, modalidades] = await Promise.all([
      estado
        ? col.distinct("cidade", { ativo: true, estado: estado.toUpperCase() })
        : Promise.resolve([]),
      col.distinct("tipo",       matchStage.$match),
      col.distinct("modalidade", matchStage.$match),
    ]);

    return NextResponse.json({
      cidades:    (cidades as string[]).sort(),
      tipos:      (tipos as string[]).filter(Boolean).sort(),
      modalidades:(modalidades as string[]).filter(Boolean).sort(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
