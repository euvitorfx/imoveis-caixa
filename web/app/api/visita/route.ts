import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function hoje() {
  return new Date().toISOString().slice(0, 10); // "2026-05-03"
}

function mesAtual() {
  return new Date().toISOString().slice(0, 7); // "2026-05"
}

export async function GET() {
  try {
    const client = await clientPromise;
    const meta = client.db(process.env.MONGODB_DB).collection("_meta");

    const doc = await meta.findOne({ key: "visitas" });
    if (!doc) {
      return NextResponse.json({ total: 0, diario: 0, mensal: 0 });
    }

    const dataHoje = hoje();
    const mesHoje  = mesAtual();

    return NextResponse.json({
      total:  doc.total         ?? 0,
      diario: doc.diario?.data  === dataHoje ? (doc.diario.count  ?? 0) : 0,
      mensal: doc.mensal?.mes   === mesHoje  ? (doc.mensal.count  ?? 0) : 0,
    });
  } catch {
    return NextResponse.json({ total: 0, diario: 0, mensal: 0 });
  }
}

export async function POST() {
  try {
    const client = await clientPromise;
    const meta = client.db(process.env.MONGODB_DB).collection("_meta");

    const dataHoje = hoje();
    const mesHoje  = mesAtual();

    const doc = await meta.findOne({ key: "visitas" });

    const diaIgual = doc?.diario?.data === dataHoje;
    const mesIgual = doc?.mensal?.mes  === mesHoje;

    // $inc e $set não podem tocar caminhos sobrepostos (ex: "diario" e "diario.count").
    // Quando o dia/mês mudou, usamos só $set para recriar o subdocumento inteiro.
    // Quando é o mesmo dia/mês, usamos só $inc no subcampo.
    const incOp: Record<string, number> = { total: 1 };
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[visita POST]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
