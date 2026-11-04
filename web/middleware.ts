import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

// Rotas que ficam acessíveis mesmo sem telefone cadastrado
const GATE_EXEMPT = ["/perfil", "/login", "/cadastro"];

// Crawlers legítimos — sempre permitidos
const GOOD_BOTS_RE =
  /googlebot|bingbot|yandexbot|duckduckbot|slurp|baiduspider|applebot|twitterbot|linkedinbot|facebot|ia_archiver|chatgpt-user|gptbot|anthropic-ai|claudebot|petalbot|semrushbot|ahrefsbot/i;

// Bibliotecas HTTP e scrapers que se identificam honestamente
const BAD_UA_RE =
  /python-requests|python-urllib|python\/|go-http-client|libwww-perl|curl\/|wget\/|scrapy|httpx|aiohttp|node-fetch|java\/|okhttp|axios\/0\./i;

export default auth((req: NextRequest & { auth?: { user?: { temTelefone?: boolean } } | null }) => {
  const { pathname, searchParams } = req.nextUrl;

  // Bot detection — antes de qualquer lógica de auth
  const ua = req.headers.get("user-agent") ?? "";
  if (!GOOD_BOTS_RE.test(ua)) {
    if (!ua.trim() || BAD_UA_RE.test(ua)) {
      return new NextResponse(null, { status: 403 });
    }
  }

  // Admin: proteção por cookie
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get("admin_token")?.value;
    if (!token || token !== process.env.ADMIN_SECRET) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  const logado = !!req.auth?.user;

  // Rastreamento de afiliado: ?ref=CODIGO → cookie blc_ref por 1 ano
  const refCode = searchParams.get("ref");
  if (refCode) {
    const res = NextResponse.next();
    res.cookies.set("blc_ref", refCode.toUpperCase(), {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
    return res;
  }

  // Área do usuário: requer sessão NextAuth
  if ((pathname.startsWith("/perfil") || pathname.startsWith("/favoritos")) && !logado) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Gate de telefone: usuário logado sem telefone é bloqueado em qualquer rota
  // exceto /perfil (onde ele completa o cadastro), /login e /cadastro
  const temTelefone = req.auth?.user?.temTelefone ?? true;
  const exempto = GATE_EXEMPT.some((r) => pathname.startsWith(r));
  if (logado && !temTelefone && !exempto) {
    const url = new URL("/perfil", req.url);
    url.searchParams.set("obrigatorio", "1");
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
