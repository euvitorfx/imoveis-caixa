import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import clientPromise from "@/lib/mongodb";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const senhaTemp = crypto.randomBytes(6).toString("hex"); // 12 chars
  const senhaHash = await bcrypt.hash(senhaTemp, 12);

  const client = await clientPromise;
  await client
    .db(process.env.MONGODB_DB)
    .collection("users")
    .updateOne({ _id: new ObjectId(id) }, { $set: { senhaHash } });

  return NextResponse.json({ senhaTemp });
}
