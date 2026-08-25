import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getResend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { emailAlertaMudancas, ImovelComMudancas, MudancaItem } from "@/emails/alertaMudancasImoveis";
import { generateUnsubToken } from "@/lib/unsubscribeToken";

const SITE_URL = "https://www.buscaleiloescaixa.com.br";

type Mudanca = {
  _id: ObjectId;
  hdnImovel: string;
  campo: string;
  de: unknown;
  para: unknown;
};

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const mudancasCol = db.collection("mudancas_imoveis");
  const imoveisCol = db.collection(process.env.MONGODB_COLLECTION!);
  const usersCol = db.collection("users");

  // 1. Mudanças ainda não notificadas
  const mudancas = (await mudancasCol
    .find({ notificado: { $ne: true } })
    .toArray()) as unknown as Mudanca[];

  if (mudancas.length === 0) {
    return NextResponse.json({ ok: true, msg: "Nenhuma mudança pendente." });
  }

  const hdnsComMudanca = [...new Set(mudancas.map((m) => m.hdnImovel))];

  // 2. Usuários que favoritaram alguma dessas propriedades e têm alertas ativos
  const usuarios = await usersCol
    .find(
      {
        email: { $exists: true, $ne: null },
        // Backwards compat: respect old `alertas: false` as master off
        "preferencias.alertas": { $ne: false },
        // New granular field (default ON when not set)
        "preferencias.alertas_mudancas_favoritos": { $ne: false },
        favoritos: { $in: hdnsComMudanca },
      },
      { projection: { name: 1, email: 1, favoritos: 1 } }
    )
    .toArray();

  // 3. Detalhes dos imóveis com mudanças
  const imoveis = await imoveisCol
    .find(
      { hdnImovel: { $in: hdnsComMudanca } },
      {
        projection: {
          hdnImovel: 1, tipo: 1, cidade: 1, estado: 1,
          preco: 1, bairro: 1, modalidade: 1, fotoMigrada: 1,
        },
      }
    )
    .toArray();

  const imovelMap = Object.fromEntries(imoveis.map((im) => [im.hdnImovel as string, im]));
  const mudancasPorHdn = mudancas.reduce<Record<string, MudancaItem[]>>((acc, m) => {
    (acc[m.hdnImovel] ??= []).push({ campo: m.campo, de: m.de, para: m.para });
    return acc;
  }, {});

  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ ok: false, msg: "Resend não configurado." }, { status: 500 });
  }

  const r2Base = process.env.R2_PUBLIC_URL ?? "https://pub-55673c9129354bcdad5bb571c2237b66.r2.dev";
  let enviados = 0;
  let erros = 0;

  for (const usuario of usuarios) {
    const favs: string[] = usuario.favoritos ?? [];
    const hdnsDoUsuario = favs.filter((hdn) => mudancasPorHdn[hdn]);
    if (hdnsDoUsuario.length === 0) continue;

    const itens: ImovelComMudancas[] = hdnsDoUsuario.map((hdn) => {
      const im = imovelMap[hdn];
      const fotoUrl = im?.fotoMigrada ? `${r2Base}/imoveis-caixa/${hdn}` : undefined;
      return {
        imovel: {
          hdnImovel: hdn,
          tipo: im?.tipo as string | undefined,
          cidade: im?.cidade as string | undefined,
          estado: im?.estado as string | undefined,
          preco: im?.preco as number | undefined,
          bairro: im?.bairro as string | undefined,
          modalidade: im?.modalidade as string | undefined,
          fotoUrl,
        },
        mudancas: mudancasPorHdn[hdn],
      };
    });

    const descadastroUrl = `${SITE_URL}/api/alertas/descadastro?token=${generateUnsubToken(usuario._id.toString())}`;

    try {
      const { subject, html } = emailAlertaMudancas({
        nome: usuario.name ?? "usuário",
        itens,
        descadastroUrl,
      });

      await resend.emails.send({
        from: EMAIL_FROM,
        replyTo: EMAIL_REPLY_TO,
        to: usuario.email,
        subject,
        html,
      });

      enviados++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[alertas-mudancas] erro ao enviar para ${usuario.email}:`, msg);
      erros++;
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  // Marcar todas as mudanças desta rodada como notificadas
  await mudancasCol.updateMany(
    { _id: { $in: mudancas.map((m) => m._id) } },
    { $set: { notificado: true } }
  );

  console.log(
    `[alertas-mudancas] mudancas=${mudancas.length} hdns=${hdnsComMudanca.length} usuarios=${usuarios.length} enviados=${enviados} erros=${erros}`
  );

  return NextResponse.json({
    ok: true,
    mudancas: mudancas.length,
    hdns: hdnsComMudanca.length,
    usuarios: usuarios.length,
    enviados,
    erros,
  });
}
