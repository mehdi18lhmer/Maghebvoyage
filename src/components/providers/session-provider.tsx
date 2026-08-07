"use client";

import { SessionProvider } from "next-auth/react";

/** Thin client boundary — next-auth's hooks (useSession, signOut) need this ancestor. */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
