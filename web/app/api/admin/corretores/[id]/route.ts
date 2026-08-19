import { NextRequest, NextResponse } from "next/server";
import { updateCorretor, deleteCorretor } from "@/lib/corretores";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Validar duplicidade de cidades entre parceiros
  if (Array.isArray(body.cidades_cobertura) && body.cidades_cobertura.length > 0) {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const conflito = await db.collection("corretores").findOne(
      {
        _id: { $ne: new ObjectId(id) },
        cidades_cobertura: {
          $elemMatch: {
            $or: body.cidades_cobertura.map((c: { uf: string; cidade: string }) => ({
              uf: c.uf,
              cidade: c.cidade,
            })),
          },
        },
      },
      { projection: { nome: 1, cidades_cobertura: 1 } }
    );

    if (conflito) {
      const chaves = new Set(
        body.cidades_cobertura.map((c: { uf: string; cidade: string }) => `${c.uf}|${c.cidade}`)
      );
      const cidadesConflito = (conflito.cidades_cobertura as { uf: string; cidade: string }[])
        .filter((c) => chaves.has(`${c.uf}|${c.cidade}`))
        .map((c) => `${c.uf} – ${c.cidade}`)
        .join(", ");
      return NextResponse.json(
        { error: `Cidade(s) já atribuída(s) a ${conflito.nome}: ${cidadesConflito}` },
        { status: 409 }
      );
    }
  }

  await updateCorretor(id, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(_req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  await deleteCorretor(id);
  return NextResponse.json({ ok: true });
}
