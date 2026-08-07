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
