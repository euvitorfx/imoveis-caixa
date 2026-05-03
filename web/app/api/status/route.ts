import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const meta   = client.db(process.env.MONGODB_DB).collection("_meta");
    const doc    = await meta.findOne({ key: "lastSync" });

    return NextResponse.json({
      lastSync:     doc?.ts        ?? null,
      totalImoveis: doc?.totalImoveis ?? 0,
    });
  } catch {
    return NextResponse.json({ lastSync: null, totalImoveis: 0 });
  }
}
