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
      total:  doc.total  ?? 0,
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

    const diaIgual = doc?.diario?.data  === dataHoje;
    const mesIgual = doc?.mensal?.mes   === mesHoje;

    await meta.updateOne(
      { key: "visitas" },
      {
        $inc: {
          total:          1,
          "diario.count": diaIgual ? 1 : 0,
          "mensal.count": mesIgual ? 1 : 0,
        },
        $set: {
          key: "visitas",
          ...(diaIgual ? {} : { diario: { data: dataHoje, count: 1 } }),
          ...(mesIgual ? {} : { mensal: { mes:  mesHoje,  count: 1 } }),
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
