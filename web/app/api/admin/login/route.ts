import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { senha } = await req.json();

  if (!process.env.ADMIN_SECRET || senha !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", process.env.ADMIN_SECRET, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 7, // 7 dias
    path:     "/",
  });
  return res;
}
