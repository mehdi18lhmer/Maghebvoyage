import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { JWT } from "next-auth/jwt";

/**
 * CDC §5.1 — "Auth : NextAuth / Auth.js — 3 rôles : ADMIN, AGENCY, CLIENT".
 *
 * Only ADMIN and AGENCY ever actually authenticate. §2/§G.1/§9.3 are explicit
 * that a client's whole journey — book, pay, cancel — needs no account; V1
 * client "identity" is just plain fields on the Booking row. This provider
 * exists only for the two roles that log in.
 *
 * Credentials + bcrypt against the Prisma `User` table directly — no
 * database-session adapter, since a Credentials provider requires the JWT
 * strategy anyway (NextAuth can't verify a password against an adapter).
 * Role and agencyId are embedded in the JWT at sign-in, which is what lets
 * `src/proxy.ts` gate routes without a database round trip on every request.
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { agency: { select: { id: true, verificationStatus: true } } },
        });

        // Same failure path whether the email doesn't exist or the password is
        // wrong — a distinct "no such user" response would let an attacker
        // enumerate registered emails.
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          agencyId: user.agency?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    // Runs on sign-in and on every subsequent request that reads the token —
    // only the sign-in call has `user`, so role/agencyId are captured once
    // and carried in the encrypted JWT from then on.
    async jwt({ token, user }) {
      if (user) {
        // `user` here is exactly what `authorize()` returned above, so these
        // casts are trusted at the boundary rather than re-validated.
        token.role = user.role as JWT["role"];
        token.agencyId = user.agencyId as string | null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
        session.user.agencyId = token.agencyId;
      }
      return session;
    },
  },
});
