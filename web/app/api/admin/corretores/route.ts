import { NextResponse } from "next/server";
import { getAllCorretores } from "@/lib/corretores";

export async function GET() {
  const corretores = await getAllCorretores();
  return NextResponse.json(corretores);
}
