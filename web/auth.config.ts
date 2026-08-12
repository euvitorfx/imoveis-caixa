import type { NextAuthConfig } from "next-auth";

// Edge-compatible config — sem imports Node.js (usado pelo middleware)
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    // Roda no middleware (edge): mapeia campos do JWT para req.auth.user
    session({ session, token }) {
      const user = session.user as unknown as Record<string, unknown>;
      if (token?.id) user.id = token.id;
      user.plano = token.plano ?? "gratuito";
      user.temTelefone = token.temTelefone ?? false;
      return session;
    },
  },
};
