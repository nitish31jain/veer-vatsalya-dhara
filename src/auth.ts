import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    async signIn({ profile }) {
      return Boolean(profile?.email && profile.email_verified);
    },
    async jwt({ token, profile }) {
      // Only on initial sign-in: create/update our user row and remember its id.
      if (profile?.email) {
        const email = profile.email.toLowerCase();
        const [user] = await db
          .insert(schema.users)
          .values({ email, name: profile.name ?? email, image: profile.picture as string | undefined })
          .onConflictDoUpdate({
            target: schema.users.email,
            set: { name: profile.name ?? email, image: profile.picture as string | undefined },
          })
          .returning({ id: schema.users.id });
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  }
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return user;
}
