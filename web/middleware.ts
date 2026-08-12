import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

// Rotas que exigem login E telefone cadastrado
const ROTAS_GATED = ["/favoritos", "/perfil/alertas"];

export default auth((req: NextRequest & { auth?: { user?: { temTelefone?: boolean } } | null }) => {
  const { pathname } = req.nextUrl;

  // Admin: proteção por cookie
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get("admin_token")?.value;
    if (!token || token !== process.env.ADMIN_SECRET) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // Área do usuário: requer sessão NextAuth
  const logado = !!req.auth?.user;

  if (pathname.startsWith("/perfil") && !logado) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Gate de telefone: redireciona para perfil se não tiver telefone cadastrado
  const temTelefone = req.auth?.user?.temTelefone ?? true;
  const precisaGate = logado && !temTelefone && ROTAS_GATED.some((r) => pathname.startsWith(r));
  if (precisaGate) {
    const url = new URL("/perfil", req.url);
    url.searchParams.set("obrigatorio", "1");
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
