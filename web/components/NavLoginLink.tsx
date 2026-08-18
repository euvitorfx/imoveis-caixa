"use client";

import { usePathname } from "next/navigation";

const SKIP = new Set(["/login", "/cadastro", "/recuperar-senha", "/redefinir-senha"]);

export default function NavLoginLink({
  className,
  style,
  children,
}: {
  className: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const href =
    pathname && !SKIP.has(pathname)
      ? `/login?callbackUrl=${encodeURIComponent(pathname)}`
      : "/login";

  return (
    <a href={href} className={className} style={style}>
      {children}
    </a>
  );
}
