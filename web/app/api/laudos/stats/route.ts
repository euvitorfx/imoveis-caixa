import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET /api/laudos/stats — público, retorna contagem de laudos entregues
export async function GET() {
  try {
    const client = await clientPromise;
    const col = client.db(process.env.MONGODB_DB).collection("laudos");
    const entregues = await col.countDocuments({ status: "entregue" });
    return NextResponse.json({ entregues });
  } catch {
    return NextResponse.json({ entregues: 0 });
  }
}
