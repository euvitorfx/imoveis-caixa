import { NextResponse } from "next/server";
import { getCorretoresAprovados } from "@/lib/corretores";

export async function GET() {
  const corretores = await getCorretoresAprovados();
  return NextResponse.json(corretores);
}
