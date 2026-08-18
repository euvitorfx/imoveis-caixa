import { NextRequest, NextResponse } from "next/server";
import { getAllProcessos } from "@/lib/processos-clube";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const processos = await getAllProcessos();
  return NextResponse.json(processos);
}
