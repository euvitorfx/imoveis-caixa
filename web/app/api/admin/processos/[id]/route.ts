import { NextRequest, NextResponse } from "next/server";
import { updateProcesso } from "@/lib/processos-clube";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { createComissaoIfNew } from "@/lib/afiliados";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  await updateProcesso(id, body);

  // Disparar comissão de afiliado quando processo concluído com valorComissaoBLC
  if (body.status === "concluido" && body.valorComissaoBLC) {
    try {
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB);

      // Buscar o processo para obter o userId
      const processo = await db.collection("processos_clube").findOne({ _id: new ObjectId(id) });
      if (processo?.userId) {
        const user = await db
          .collection("users")
          .findOne({ _id: new ObjectId(processo.userId) }, { projection: { afiliadoRefId: 1 } });

        if (user?.afiliadoRefId) {
          const afiliado = await db
            .collection("afiliados")
            .findOne({ _id: new ObjectId(user.afiliadoRefId) });

          if (afiliado?.ativo) {
            const percentual: number = afiliado.percentualComissao;
            const valorAfiliado = (body.valorComissaoBLC * percentual) / 100;

            await createComissaoIfNew({
              afiliadoId: afiliado._id.toString(),
              processoId: id,
              userId: processo.userId,
              valorComissaoBLC: body.valorComissaoBLC,
              valorAfiliado,
              percentual,
              status: "pendente",
            });
          }
        }
      }
    } catch (err) {
      console.error("[afiliado] erro ao criar comissão:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
