import type { NextAuthConfig } from "next-auth";

// Edge-compatible config — sem imports Node.js (usado pelo middleware)
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [],
};
