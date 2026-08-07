import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateSession } from "@/utils/supabase/middleware";

/**
 * Role gate (CDC §10 — "Protection des routes par rôle") + Supabase session
 * refresh, in one file: Next.js only allows a single proxy/middleware entry
 * point per app, so both concerns live here rather than fighting over it.
 *
 * `auth()` wraps the handler and populates `req.auth` from the session JWT —
 * this is what makes CDC §11 test #5 ("an AGENCY session hitting /admin/* must
 * be rejected") enforceable at the edge, before a page or API route even
 * renders. This is defense in depth, not the only check: every route handler
 * still re-verifies role and, for agency data, ownership — a route that
 * relied solely on this gate would break the moment it was called any other
 * way (a cron job, a test, a future non-browser client).
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isAgencyRoute = pathname.startsWith("/agency");
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAgencyRoute || isAdminRoute) {
    if (!session?.user) {
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = session.user.role;
    if (isAgencyRoute && role !== "AGENCY") {
      // A logged-in but wrong-role visitor is sent to *their* dashboard
      // rather than /login — they're authenticated, just not authorized here.
      return NextResponse.redirect(new URL(role === "ADMIN" ? "/admin" : "/", req.nextUrl.origin));
    }
    if (isAdminRoute && role !== "ADMIN") {
      return NextResponse.redirect(new URL(role === "AGENCY" ? "/agency" : "/", req.nextUrl.origin));
    }
  }

  return updateSession(req);
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
