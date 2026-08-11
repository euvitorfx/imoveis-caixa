"use client";

import { SessionProvider } from "next-auth/react";
import { FavoritosProvider } from "./FavoritosProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FavoritosProvider>{children}</FavoritosProvider>
    </SessionProvider>
  );
}
