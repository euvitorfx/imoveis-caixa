import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { authConfig } from "./auth.config";
import { getResend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import { emailBoasVindas } from "@/emails/boasVindas";
import { getCorretorByUserId } from "@/lib/corretores";

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise, { databaseName: process.env.MONGODB_DB }),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const client = await clientPromise;
        const user = await client
          .db(process.env.MONGODB_DB)
          .collection("users")
          .findOne({ email: credentials.email as string });
        if (!user?.senhaHash) return null;
        const ok = await bcrypt.compare(credentials.password as string, user.senhaHash);
        if (!ok) return null;
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          plano: user.plano ?? "gratuito",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.plano = (user as { plano?: "gratuito" | "premium" }).plano ?? "gratuito";
        // Verifica telefone no banco ao fazer login
        const client = await clientPromise;
        const dbUser = await client
          .db(process.env.MONGODB_DB)
          .collection("users")
          .findOne({ _id: new ObjectId(user.id!) }, { projection: { telefone: 1, plano: 1, popupFeaturesVisto: 1 } });
        token.temTelefone = !!dbUser?.telefone;
        token.plano = dbUser?.plano ?? "gratuito";
        token.popupFeaturesVisto = !!dbUser?.popupFeaturesVisto;
        const corretor = await getCorretorByUserId(user.id!);
        token.corretorId = corretor?._id ?? undefined;
      }
      if (trigger === "update") {
        // Chamado via useSession().update() após salvar telefone
        const client = await clientPromise;
        const dbUser = await client
          .db(process.env.MONGODB_DB)
          .collection("users")
          .findOne({ _id: new ObjectId(token.id as string) }, { projection: { telefone: 1 } });
        token.temTelefone = !!dbUser?.telefone;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      session.user.plano = (token.plano as "gratuito" | "premium") ?? "gratuito";
      session.user.temTelefone = token.temTelefone ?? false;
      session.user.popupFeaturesVisto = token.popupFeaturesVisto ?? false;
      if (token.corretorId) session.user.corretorId = token.corretorId as string;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const client = await clientPromise;
      await client
        .db(process.env.MONGODB_DB)
        .collection("users")
        .updateOne(
          { _id: new ObjectId(user.id!) },
          { $set: { plano: "gratuito", criadoEm: new Date() } }
        );
      if (user.email && user.name) {
        const resend = getResend();
        if (resend) {
          try {
            const { subject, html } = emailBoasVindas(user.name);
            const res = await resend.emails.send({
              from: EMAIL_FROM,
              replyTo: EMAIL_REPLY_TO,
              to: user.email,
              subject,
              html,
            });
            console.log("[resend] boas-vindas OAuth enviado:", res.data?.id);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[resend] ERRO boas-vindas OAuth:", msg);
          }
        }
      }
    },
  },
});
