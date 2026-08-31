import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";

// UTC-3 (horário de Brasília)
function hojeUTC3() {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10); // "2026-05-04"
}

function mesAtualUTC3() {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 7); // "2026-05"
}

export async function GET() {
  try {
    const client = await clientPromise;
    const meta = client.db(process.env.MONGODB_DB).collection("_meta");

    const doc = await meta.findOne({ key: "visitas" });
    if (!doc) {
      return NextResponse.json({ diario: 0, mensal: 0, pageviews: 0 });
    }

    const dataHoje = hojeUTC3();
    const mesHoje  = mesAtualUTC3();

    return NextResponse.json({
      diario:    doc.diario?.data === dataHoje ? (doc.diario.count  ?? 0) : 0,
      mensal:    doc.mensal?.mes  === mesHoje  ? (doc.mensal.count  ?? 0) : 0,
      pageviews: doc.pageviews ?? 0,
    });
  } catch {
    return NextResponse.json({ diario: 0, mensal: 0, pageviews: 0 });
  }
}

const BOT_UA = /bot|crawler|spider|slurp|scrapy|python|curl\/|wget\/|headless|prerender|phantom|selenium/i;

export async function POST(req: NextRequest) {
  const userAgent = req.headers.get("user-agent") ?? "";
  if (BOT_UA.test(userAgent)) {
    return NextResponse.json({ ok: true });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const novaSessao = body.novaSessao === true;

    const client = await clientPromise;
    const meta = client.db(process.env.MONGODB_DB).collection("_meta");

    if (!novaSessao) {
      // Fast path: only pageview increment — no findOne needed
      meta.updateOne(
        { key: "visitas" },
        { $inc: { pageviews: 1 }, $setOnInsert: { key: "visitas" } },
        { upsert: true },
      ).catch(() => {});

      // Track logged-in user activity (fire and forget)
      auth().then((session) => {
        if (session?.user?.id) {
          client.db(process.env.MONGODB_DB).collection("users").updateOne(
            { _id: new ObjectId(session.user.id) },
            { $inc: { totalPageviews: 1 }, $set: { ultimoAcesso: new Date() } },
          ).catch(() => {});
        }
      }).catch(() => {});

      return NextResponse.json({ ok: true });
    }

    // Nova sessão: need to check if day/month rolled over
    const dataHoje = hojeUTC3();
    const mesHoje  = mesAtualUTC3();

    const doc = await meta.findOne({ key: "visitas" });

    const diaIgual = doc?.diario?.data === dataHoje;
    const mesIgual = doc?.mensal?.mes  === mesHoje;

    const incOp: Record<string, number> = { pageviews: 1 };
    const setOp: Record<string, unknown> = { key: "visitas" };

    if (diaIgual) {
      incOp["diario.count"] = 1;
    } else {
      setOp["diario"] = { data: dataHoje, count: 1 };
    }

    if (mesIgual) {
      incOp["mensal.count"] = 1;
    } else {
      setOp["mensal"] = { mes: mesHoje, count: 1 };
    }

    await meta.updateOne(
      { key: "visitas" },
      { $inc: incOp, $set: setOp },
      { upsert: true },
    );

    // Track logged-in user activity (fire and forget)
    auth().then((session) => {
      if (session?.user?.id) {
        client.db(process.env.MONGODB_DB).collection("users").updateOne(
          { _id: new ObjectId(session.user.id) },
          { $inc: { totalPageviews: 1, totalSessoes: 1 }, $set: { ultimoAcesso: new Date() } },
        ).catch(() => {});
      }
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[visita POST]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
