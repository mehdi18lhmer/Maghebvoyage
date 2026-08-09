import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { auth } from "@/auth";
import { updateSession } from "@/utils/supabase/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Role gate (CDC §10 — "Protection des routes par rôle") + locale routing +
 * Supabase session refresh, in one file: Next.js only allows a single
 * proxy/middleware entry point per app, so all three concerns live here
 * rather than fighting over it.
 *
 * `auth()` wraps the handler and populates `req.auth` from the session JWT —
 * this is what makes CDC §11 test #5 ("an AGENCY session hitting /admin/* must
 * be rejected") enforceable at the edge, before a page or API route even
 * renders. This is defense in depth, not the only check: every route handler
 * still re-verifies role and, for agency data, ownership — a route that
 * relied solely on this gate would break the moment it was called any other
 * way (a cron job, a test, a future non-browser client).
 *
 * i18n is deliberately scoped to the client-facing site only: agency/admin
 * dashboards and the login/register screens live outside the `[locale]`
 * segment and never go through `intlMiddleware`, so they stay French/LTR
 * without a locale prefix, and this gate's redirect targets ("/admin",
 * "/agency", "/login") stay simple unprefixed paths.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isApiRoute = pathname.startsWith("/api");
  const isAgencyRoute = pathname.startsWith("/agency");
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");

  // API routes are never locale-prefixed and must never be rewritten by
  // intlMiddleware — NextAuth's own client fetches /api/auth/session and
  // expects JSON back; routing it through next-intl silently turned that
  // into an HTML redirect page, which the client then failed to parse.
  if (isApiRoute) {
    return updateSession(req);
  }

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
    return updateSession(req);
  }

  if (isAuthRoute) {
    return updateSession(req);
  }

  // Client-accounts pivot (CLAUDE.md drift — see project memory): the AI
  // planner and the booking-confirmation step now require a CLIENT session,
  // gated at "before using the AI planner too" per the product decision, not
  // just at final payment. This only fires once a locale prefix is already
  // present — an unprefixed request falls through to intlMiddleware below,
  // which redirects to the detected locale first, and the follow-up
  // prefixed request is what actually hits this check.
  const localeMatch = pathname.match(/^\/(fr|en|ar)(\/.*)?$/);
  if (localeMatch) {
    const locale = localeMatch[1];
    const rest = localeMatch[2] ?? "/";
    const isProtectedClientRoute =
      rest === "/demande" ||
      rest.startsWith("/demande/") ||
      rest === "/account" ||
      rest.startsWith("/account/") ||
      (rest.startsWith("/booking/") && !rest.startsWith("/booking/success"));

    if (isProtectedClientRoute && (!session?.user || session.user.role !== "CLIENT")) {
      const loginUrl = new URL(`/${locale}/login`, req.nextUrl.origin);
      loginUrl.searchParams.set("from", rest);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Everything else — the marketing pages, /voyages, /trip, /demande,
  // /booking, /legal — is locale-prefixed; next-intl decides /fr, /en or /ar
  // (auto-detected from Accept-Language on first visit, then remembered via
  // its own cookie) and redirects/rewrites accordingly.
  return intlMiddleware(req);
});

export const config = {
  matcher: [
    // robots.txt/sitemap.xml must stay reachable at their literal root paths —
    // a crawler doesn't follow a redirect to /fr/robots.txt, and that route
    // doesn't exist anyway. Static icon/OG-image files are already excluded
    // by the extension pattern below.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
