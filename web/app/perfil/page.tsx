import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

async function getUserData(id: string) {
  const client = await clientPromise;
  return client
    .db(process.env.MONGODB_DB)
    .collection("users")
    .findOne(
      { _id: new ObjectId(id) },
      { projection: { name: 1, email: 1, telefone: 1, plano: 1, criadoEm: 1, favoritos: 1 } }
    );
}

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await getUserData(session.user.id);
  const totalFavoritos = user?.favoritos?.length ?? 0;
  const plano = user?.plano ?? "gratuito";
  const criadoEm = user?.criadoEm
    ? new Date(user.criadoEm).toLocaleDateString("pt-BR")
    : "—";

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Minha conta</h1>

      {/* Card do usuário */}
      <div className="bg-white rounded-2xl shadow p-6 mb-4">
        <div className="flex items-center gap-4 mb-4">
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="w-14 h-14 rounded-full" />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor: "#01304D" }}
            >
              {(user?.name ?? session.user.name ?? "U")[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-800 text-lg">{user?.name ?? session.user.name}</p>
            <p className="text-sm text-gray-500">{user?.email ?? session.user.email}</p>
            {user?.telefone && (
              <p className="text-sm text-gray-400 mt-0.5">{user.telefone}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-0.5">Plano</p>
            <p className="font-semibold capitalize" style={{ color: "#01304D" }}>
              {plano === "gratuito" ? "Gratuito" : "Premium"}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-0.5">Membro desde</p>
            <p className="font-semibold text-gray-700">{criadoEm}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-0.5">Favoritos</p>
            <p className="font-semibold text-gray-700">
              {totalFavoritos}
              {plano === "gratuito" && <span className="text-gray-400 font-normal"> / 10</span>}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-0.5">Alertas de e-mail</p>
            <p className="font-semibold text-gray-400 text-xs">Em breve</p>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="bg-white rounded-2xl shadow p-4 mb-4 flex flex-col gap-0.5">
        <a
          href="/favoritos"
          className="flex items-center justify-between px-2 py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
        >
          <span>♥ Meus favoritos</span>
          <span className="text-gray-400 text-xs">{totalFavoritos} imóvel{totalFavoritos !== 1 ? "s" : ""}</span>
        </a>
      </div>

      {/* Logout */}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="w-full py-3 rounded-xl text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
        >
          Sair da conta
        </button>
      </form>
    </div>
  );
}
