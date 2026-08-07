import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Refreshes the Supabase session on every request that passes through
 * middleware.ts. Session cookies expire; without this, a Server Component
 * can silently see a stale/expired session because nothing ever calls
 * `getUser()` to trigger a refresh.
 *
 * IMPORTANT (per Supabase's own docs): do not remove the `getUser()` call
 * below, do not run code between creating the client and calling `getUser()`,
 * and do not swap it for `getSession()` — `getSession()` reads the JWT
 * without revalidating it against the auth server, so it can return a user
 * that has since been deleted or signed out elsewhere.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not remove — see the doc comment above.
  await supabase.auth.getUser();

  return supabaseResponse;
}
