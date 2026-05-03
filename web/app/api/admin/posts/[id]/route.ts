import { NextRequest, NextResponse } from "next/server";
import { updatePost, deletePost } from "@/lib/blog";
import { revalidatePath } from "next/cache";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { _id, criadoEm, ...body } = await req.json();
  void _id; void criadoEm;
  await updatePost(id, body);
  revalidatePath("/blog");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deletePost(id);
  revalidatePath("/blog");
  return NextResponse.json({ ok: true });
}
