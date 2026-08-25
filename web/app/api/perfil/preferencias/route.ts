import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const {
    brasil,
    estados,
    cidades,
    alertas_novos_imoveis,
    alertas_mudancas_favoritos,
    alertas_clube_blc,
  } = await req.json();

  const client = await clientPromise;
  await client
    .db(process.env.MONGODB_DB)
    .collection("users")
    .updateOne(
      { _id: new ObjectId(session.user.id) },
      {
        $set: {
          preferencias: {
            brasil: !!brasil,
            estados: estados ?? [],
            cidades: cidades ?? [],
            // Legacy field kept as true after migration (individual fields take over)
            alertas: true,
            alertas_novos_imoveis: alertas_novos_imoveis !== false,
            alertas_mudancas_favoritos: alertas_mudancas_favoritos !== false,
            alertas_clube_blc: alertas_clube_blc !== false,
          },
        },
      }
    );

  return NextResponse.json({ ok: true });
}
