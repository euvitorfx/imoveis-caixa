import { NextRequest, NextResponse } from "next/server";
import { updateCorretor, deleteCorretor } from "@/lib/corretores";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  await updateCorretor(id, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteCorretor(id);
  return NextResponse.json({ ok: true });
}
