import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const estadoRaw = searchParams.get("estado") || "";
  const cidadeRaw = searchParams.get("cidade") || "";

  const estadoList = estadoRaw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const cidadeList = cidadeRaw.split(",").map((s) => s.trim()).filter(Boolean);

  try {
    const client = await clientPromise;
    const col    = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseMatch: Record<string, any> = { ativo: true };
    if (estadoList.length === 1) baseMatch.estado = estadoList[0];
    else if (estadoList.length > 1) baseMatch.estado = { $in: estadoList };
    if (cidadeList.length === 1) baseMatch.cidade = { $regex: cidadeList[0], $options: "i" };
    else if (cidadeList.length > 1) baseMatch.cidade = { $in: cidadeList };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cidadeMatch: Record<string, any> = { ativo: true };
    if (estadoList.length === 1) cidadeMatch.estado = estadoList[0];
    else if (estadoList.length > 1) cidadeMatch.estado = { $in: estadoList };

    const [cidades, bairros, tipos, modalidades] = await Promise.all([
      estadoList.length > 0 ? col.distinct("cidade", cidadeMatch) : Promise.resolve([]),
      cidadeList.length > 0 ? col.distinct("bairro", baseMatch)   : Promise.resolve([]),
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
