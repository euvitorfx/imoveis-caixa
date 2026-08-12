import type { NextAuthConfig } from "next-auth";

// Edge-compatible config — sem imports Node.js (usado pelo middleware)
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    // Roda no middleware (edge): mapeia campos do JWT para req.auth.user
    session({ session, token }) {
      if (token?.id) (session.user as Record<string, unknown>).id = token.id;
      (session.user as Record<string, unknown>).plano = token.plano ?? "gratuito";
      (session.user as Record<string, unknown>).temTelefone = token.temTelefone ?? false;
      return session;
    },
  },
};
