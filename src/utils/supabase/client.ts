import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client — for Client Components.
 *
 * The publishable key is meant to be public (it's what NEXT_PUBLIC_ is for);
 * row-level access is enforced by RLS policies in Postgres, not by keeping
 * this key secret. Never put the service_role/secret key behind a
 * NEXT_PUBLIC_ variable — that key bypasses RLS entirely.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
