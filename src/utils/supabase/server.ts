import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client — for Server Components, Route Handlers, and
 * Server Actions. Reads the session from cookies via Next's `cookies()`.
 *
 * Per the Supabase skill's security checklist: this uses the *publishable*
 * key only. The service_role/secret key must never appear in a client that
 * a request handler exposes — if a future admin-only operation needs to
 * bypass RLS, it gets its own server-only client with SUPABASE_SECRET_KEY,
 * never this one.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component, which can't set cookies directly.
            // Harmless as long as middleware.ts is refreshing the session.
          }
        },
      },
    }
  );
}
