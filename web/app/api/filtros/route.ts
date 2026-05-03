import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const estado = searchParams.get("estado") || "";
  const cidade = searchParams.get("cidade") || "";

  try {
    const client = await clientPromise;
    const col    = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseMatch: Record<string, any> = { ativo: true };
    if (estado) baseMatch.estado = estado.toUpperCase();
    if (cidade) baseMatch.cidade = { $regex: cidade, $options: "i" };

    const cidadeMatch = estado ? { ativo: true, estado: estado.toUpperCase() } : { ativo: true };

    const [cidades, bairros, tipos, modalidades] = await Promise.all([
      estado ? col.distinct("cidade", cidadeMatch) : Promise.resolve([]),
      cidade ? col.distinct("bairro", baseMatch)   : Promise.resolve([]),
      col.distinct("tipo",       baseMatch),
      col.distinct("modalidade", baseMatch),
    ]);

    return NextResponse.json({
      cidades:     (cidades as string[]).filter(Boolean).sort(),
      bairros:     (bairros as string[]).filter(Boolean).sort(),
      tipos:       (tipos as string[]).filter(Boolean).sort(),
      modalidades: (modalidades as string[]).filter(Boolean).sort(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
