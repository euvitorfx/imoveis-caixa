import { auth } from "@/auth";

export default async function NavAuthMobile() {
  const session = await auth();

  if (session?.user) {
    const nome = session.user.name?.split(" ")[0] ?? "Minha conta";
    return (
      <a
        href="/perfil"
        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
        style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff" }}
      >
        <span className="text-sm leading-none">👤</span>
        {nome}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <a
        href="/login"
        className="text-xs font-medium px-2.5 py-1 rounded-full border"
        style={{ borderColor: "rgba(255,255,255,0.4)", color: "rgba(255,255,255,0.85)" }}
      >
        Entrar
      </a>
      <a
        href="/cadastro"
        className="text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ backgroundColor: "#F59E0B", color: "#1C1917" }}
      >
        Cadastrar
      </a>
    </div>
  );
}
