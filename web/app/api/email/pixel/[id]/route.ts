import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

type Ctx = { params: Promise<{ id: string }> };

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;

  try {
    const client = await clientPromise;
    await client
      .db(process.env.MONGODB_DB)
      .collection("email_opens")
      .insertOne({
        campanhaId: id,
        userAgent: req.headers.get("user-agent") ?? "",
        abrioEm: new Date().toISOString(),
      });
  } catch {}

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
