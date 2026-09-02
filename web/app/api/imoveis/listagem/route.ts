import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { slugify } from "@/lib/utils";

export const revalidate = 1800;

const LIMIT = 24;

const PROJECT = {
  _id: 1, hdnImovel: 1, estado: 1, cidade: 1, bairro: 1,
  endereco: 1, preco: 1, precoAval: 1, desconto: 1,
  modalidade: 1, financiamento: 1, tipo: 1,
  areaTotal: 1, areaUtil: 1, quartos: 1, vagas: 1, suites: 1,
  fotoUrl: 1, urlDetalhe: 1, dataLeilao1: 1, fgts: 1, ocupacao: 1,
};

export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams;
  const uf     = sp.get("uf")?.toUpperCase();
  const cidade = sp.get("cidade"); // slug
  const page   = Math.max(1, parseInt(sp.get("page") || "1"));
  const skip   = (page - 1) * LIMIT;

  if (!uf) return NextResponse.json({ error: "uf obrigatório" }, { status: 400 });

  try {
    const client = await clientPromise;
    const col    = client.db(process.env.MONGODB_DB).collection(process.env.MONGODB_COLLECTION!);

    // Resolve slug da cidade para nome real (se fornecido)
    let cidadeReal: string | null = null;
    if (cidade) {
      const cidades = await col.distinct("cidade", { estado: uf, ativo: true }) as string[];
      cidadeReal = cidades.find((c) => slugify(c) === cidade) ?? null;
      if (!cidadeReal) return NextResponse.json({ imoveis: [], total: 0, page, totalPages: 0 });
    }

    const filter = cidadeReal
      ? { ativo: true, estado: uf, cidade: { $regex: `^${cidadeReal}$`, $options: "i" } }
      : { ativo: true, estado: uf };

    const [docs, total] = await Promise.all([
      col.find(filter).sort({ preco: 1 }).skip(skip).limit(LIMIT).project(PROJECT).toArray(),
      col.countDocuments(filter),
    ]);

    return NextResponse.json({
      imoveis:    docs.map((d) => ({ ...d, _id: d._id.toString() })),
      total,
      page,
      totalPages: Math.ceil(total / LIMIT),
    });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
