import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plano: "gratuito" | "premium";
      temTelefone: boolean;
      popupFeaturesVisto: boolean;
      corretorId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    plano?: "gratuito" | "premium";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    plano?: "gratuito" | "premium";
    temTelefone?: boolean;
    popupFeaturesVisto?: boolean;
    corretorId?: string;
  }
}
