import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("foto") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });

  const timestamp = Math.round(Date.now() / 1000);
  const folder = "perfil";
  const paramsStr = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramsStr + process.env.CLOUDINARY_API_SECRET)
    .digest("hex");

  const upload = new FormData();
  upload.append("file", file);
  upload.append("api_key", process.env.CLOUDINARY_API_KEY!);
  upload.append("timestamp", String(timestamp));
  upload.append("signature", signature);
  upload.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: upload }
  );
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: "Erro no upload" }, { status: 500 });

  const url: string = data.secure_url;

  const client = await clientPromise;
  await client
    .db(process.env.MONGODB_DB)
    .collection("users")
    .updateOne({ _id: new ObjectId(session.user.id) }, { $set: { foto: url } });

  return NextResponse.json({ url });
}
