import { auth } from "@/auth";

export default async function NavAuth() {
  const session = await auth();

  if (session?.user) {
    const nome = session.user.name?.split(" ")[0] ?? "Minha conta";
    return (
      <a
        href="/perfil"
        className="flex items-center gap-1.5 text-sm font-medium hover:opacity-90 transition-opacity px-3 py-1 rounded-full"
        style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff" }}
      >
        <span className="text-base leading-none">👤</span>
        {nome}
      </a>
    );
  }

  return (
    <a
      href="/login"
      className="flex items-center gap-1 text-sm font-medium hover:opacity-90 transition-opacity px-3 py-1 rounded-full border"
      style={{ borderColor: "rgba(255,255,255,0.4)", color: "rgba(255,255,255,0.85)" }}
    >
      Entrar
    </a>
  );
}
