"use client";

import { createContext, useContext } from "react";
import type { Agency } from "@/generated/prisma";

/**
 * Makes the logged-in agency's own row available to every page under
 * /agency/** without each one re-fetching or re-deriving it.
 *
 * Populated once, server-side, in agency/layout.tsx (via `auth()` + Prisma,
 * scoped to `session.user.agencyId`) and handed down as plain serialized data
 * — this is deliberately a plain context, not a client-side fetch, so a page
 * can never render with a *different* agency's data than the one the session
 * actually belongs to.
 */
const AgencyContext = createContext<Agency | null>(null);

export function AgencyProvider({ agency, children }: { agency: Agency; children: React.ReactNode }) {
  return <AgencyContext.Provider value={agency}>{children}</AgencyContext.Provider>;
}

export function useCurrentAgency(): Agency {
  const agency = useContext(AgencyContext);
  if (!agency) {
    throw new Error("useCurrentAgency() called outside the /agency layout — no AgencyProvider in the tree.");
  }
  return agency;
}
