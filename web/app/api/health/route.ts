import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const checks: Record<string, string> = {
    MONGODB_URI:        process.env.MONGODB_URI        ? "✓ set" : "✗ MISSING",
    MONGODB_DB:         process.env.MONGODB_DB         ? "✓ set" : "✗ MISSING",
    MONGODB_COLLECTION: process.env.MONGODB_COLLECTION ? "✓ set" : "✗ MISSING",
  };

  try {
    const client = await clientPromise;
    const db     = client.db(process.env.MONGODB_DB);
    const count  = await db.collection(process.env.MONGODB_COLLECTION!).countDocuments({ ativo: true });
    checks.mongo_connection = "✓ connected";
    checks.total_imoveis    = String(count);
  } catch (err) {
    checks.mongo_connection = `✗ ERROR: ${String(err)}`;
  }

  return NextResponse.json(checks);
}
