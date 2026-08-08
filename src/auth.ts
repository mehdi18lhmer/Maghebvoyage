import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { send, magicLinkEmailHtml, magicLinkEmailSubject } from "@/services/email.service";

/**
 * Three roles authenticate now: ADMIN, AGENCY, and — as of this pass — CLIENT.
 * (Earlier revisions of this file, and CLAUDE.md's CDC brief, deliberately
 * kept clients account-free; that decision was reversed in-session and this
 * now intentionally diverges from the checked-in brief. See project memory
 * for the full context if this looks like drift.)
 *
 * Two providers:
 *  - Credentials + bcrypt, shared by all three roles.
 *  - Resend (magic link), CLIENT-only in practice — nothing stops an agency
 *    email from requesting one, but the register/login UI only offers it on
 *    the client-facing pages.
 *
 * The Email/magic-link flow fundamentally needs a database adapter (it has
 * to persist a verification token between "send the email" and "the link
 * gets clicked" — there's no way to do that statelessly the way Credentials
 * checks a password inline). Sessions stay JWT regardless — Auth.js
 * explicitly supports adapter + JWT together, and `src/proxy.ts`'s role
 * gate depends on reading role/agencyId out of the token without a DB
 * round trip on every request.
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM ?? "MaghrebVoyage <onboarding@resend.dev>",
      // Overrides the provider's generic English-only default so the magic
      // link matches the app's branding and the visitor's chosen locale.
      // Auth.js doesn't give this callback a locale directly — it only hands
      // over the verification `url`, which embeds the `callbackUrl` the
      // sign-in form requested (see (public)/login/page.tsx, which always
      // passes a locale-prefixed one, e.g. "/en/account/bookings"). The
      // locale is read back out of that path's first segment.
      async sendVerificationRequest({ identifier, url }) {
        const callbackUrl = new URL(url).searchParams.get("callbackUrl") ?? "";
        const locale = callbackUrl.replace(/^\//, "").split("/")[0] || "fr";
        const result = await send({
          to: identifier,
          subject: magicLinkEmailSubject(locale),
          html: magicLinkEmailHtml(url, locale),
        });
        if (!result.ok) {
          // Unlike the fire-and-forget notification emails elsewhere, a
          // failed sign-in email must surface — the visitor has no other way
          // to know the link never arrived.
          throw new Error(`magic-link email failed: ${result.error}`);
        }
      },
    }),
  ],
  callbacks: {
    // Runs on sign-in and on every subsequent request that reads the token —
    // only the sign-in call has `user`. Re-fetches role/agencyId from the DB
    // rather than trusting the shape handed back by whichever provider
    // signed this in: Credentials' authorize() attaches them directly, but
    // the Resend/magic-link flow goes through the Prisma adapter instead,
    // whose returned user object only reliably carries Auth.js's own core
    // fields — trusting it would silently leave role/agencyId undefined for
    // every magic-link sign-in.
    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { agency: { select: { id: true } } },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.agencyId = dbUser.agency?.id ?? null;
        }
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
