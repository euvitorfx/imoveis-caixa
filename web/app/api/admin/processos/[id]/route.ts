import { NextRequest, NextResponse } from "next/server";
import { updateProcesso } from "@/lib/processos-clube";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  await updateProcesso(id, body);
  return NextResponse.json({ ok: true });
}
