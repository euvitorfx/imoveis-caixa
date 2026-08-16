import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getResend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { emailAlertaNovos, ImovelPreview } from "@/emails/alertaNovosImoveis";

type Prefs = { brasil?: boolean; estados?: string[]; cidades?: string[]; alertas?: boolean };

function matchesPrefs(imovel: { cidade?: string; estado?: string }, prefs: Prefs): boolean {
  if (prefs.brasil) return true;

  const estados = prefs.estados ?? [];
  const cidades = prefs.cidades ?? [];

  if (!imovel.estado || !estados.includes(imovel.estado)) return false;

  const cidadesDoEstado = cidades.filter((c) => c.endsWith(`|${imovel.estado}`));
  if (cidadesDoEstado.length === 0) return true;

  return cidadesDoEstado.includes(`${imovel.cidade}|${imovel.estado}`);
}

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
  const imoveisCol = db.collection(process.env.MONGODB_COLLECTION!);
  const usersCol = db.collection("users");

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const novosImoveis = (await imoveisCol
    .find(
      { dataInsercao: { $gte: since }, ativo: true },
      {
        projection: {
          hdnImovel: 1,
          tipo: 1,
          cidade: 1,
          estado: 1,
          preco: 1,
          areaTotal: 1,
          bairro: 1,
          modalidade: 1,
        },
      }
    )
    .toArray()) as unknown as ImovelPreview[];

  if (novosImoveis.length === 0) {
    return NextResponse.json({ ok: true, msg: "Nenhum imóvel novo nas últimas 24h." });
  }

  const usuarios = await usersCol
    .find(
      {
        email: { $exists: true, $ne: null },
        "preferencias.alertas": { $ne: false },
        $or: [
          { "preferencias.brasil": true },
          { "preferencias.estados.0": { $exists: true } },
          { "preferencias.cidades.0": { $exists: true } },
        ],
      },
      { projection: { name: 1, email: 1, preferencias: 1 } }
    )
    .toArray();

  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ ok: false, msg: "Resend não configurado." }, { status: 500 });
  }

  let enviados = 0;
  let semMatch = 0;
  let erros = 0;

  for (const usuario of usuarios) {
    const prefs: Prefs = usuario.preferencias ?? {};

    const imoveisMatch = novosImoveis.filter((im) => matchesPrefs(im, prefs));

    if (imoveisMatch.length === 0) {
      semMatch++;
      continue;
    }

    const top20 = imoveisMatch
      .slice()
      .sort((a, b) => (a.preco ?? Infinity) - (b.preco ?? Infinity))
      .slice(0, 20);

    try {
      const { subject, html } = emailAlertaNovos({
        nome: usuario.name ?? "usuário",
        imoveis: top20,
        total: imoveisMatch.length,
        prefs,
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
      console.error(`[alertas] erro ao enviar para ${usuario.email}:`, msg);
      erros++;
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`[alertas] novosImoveis=${novosImoveis.length} usuarios=${usuarios.length} enviados=${enviados} semMatch=${semMatch} erros=${erros}`);

  return NextResponse.json({
    ok: true,
    novosImoveis: novosImoveis.length,
    usuarios: usuarios.length,
    enviados,
    semMatch,
    erros,
  });
}
