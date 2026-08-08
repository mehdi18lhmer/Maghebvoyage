import type { Role } from "@/generated/prisma";
import type { DefaultSession } from "next-auth";

/**
 * Extends NextAuth's built-in types with the two fields every protected route
 * and the proxy role-gate depend on. Without this, `session.user.role` is a
 * type error everywhere it's read.
 */
declare module "next-auth" {
  interface User {
    role: Role;
    agencyId: string | null;
  }

  interface Session {
    user: {
      role: Role;
      agencyId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    agencyId: string | null;
  }
}

// Auth.js v5's `jwt`/`session` callback params are typed against
// `@auth/core/jwt`'s `JWT`, not `next-auth/jwt`'s re-export of it — augmenting
// only "next-auth/jwt" doesn't merge into that underlying interface, and
// leaves `token.role`/`token.agencyId` reading back as `unknown`.
declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    agencyId: string | null;
  }
}
