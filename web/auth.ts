import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.plano = (user as { plano?: string }).plano ?? "gratuito";
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      (session.user as { plano?: string }).plano = (token.plano as string) ?? "gratuito";
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Define plano padrão para novos usuários OAuth
      const client = await clientPromise;
      await client
        .db(process.env.MONGODB_DB)
        .collection("users")
        .updateOne(
          { _id: new ObjectId(user.id!) },
          { $set: { plano: "gratuito", criadoEm: new Date() } }
        );
    },
  },
});
