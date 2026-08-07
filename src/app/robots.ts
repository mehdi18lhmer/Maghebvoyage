import type { MetadataRoute } from "next";

/**
 * Dynamic robots.txt (Next's file convention — no static /public/robots.txt
 * needed). Blocks everything that isn't marketing/booking content: the
 * agency/admin dashboards (auth-gated anyway, but robots.txt is
 * belt-and-suspenders), the login screen, API routes, and the booking pages,
 * which carry personal cancellation tokens and confirmation codes in their
 * URLs — not content that should ever be indexed.
 *
 * `/register/agency` is deliberately NOT blocked — unlike `/login`, it's a
 * real acquisition page ("devenir agence partenaire") worth ranking for, and
 * it's the one entry from this route group also listed in sitemap.ts.
 */
export default function robots(): MetadataRoute.Robots {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/agency", "/login", "/booking", "/api"],
    },
    sitemap: `${url}/sitemap.xml`,
  };
}
