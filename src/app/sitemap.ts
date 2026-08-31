import type { MetadataRoute } from "next";

// Without this, Next prerenders the sitemap once at build time and freezes
// it — a trip an agency publishes tomorrow wouldn't appear until the next
// deploy. One hour keeps it fresh without hitting Postgres on every crawl.
export const revalidate = 3600;

/**
 * Dynamic sitemap — real Prisma data, not a static list, so a trip an agency
 * publishes today is discoverable by crawlers on the next request rather than
 * needing a redeploy. Only ever includes what's actually reachable and worth
 * indexing: bookable trips and verified agency profiles, never DRAFT/
 * CANCELLED trips or PENDING/REJECTED agencies.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${url}/`, changeFrequency: "daily", priority: 1 },
    { url: `${url}/voyages`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${url}/demande`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${url}/register/agency`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${url}/legal/cgu`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${url}/legal/confidentialite`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${url}/legal/remboursements`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${url}/legal/mentions`, changeFrequency: "yearly", priority: 0.1 },
  ];

  // Preview deployments can intentionally run without production database
  // credentials. Keep the public sitemap available instead of failing the
  // entire build; production still appends live trips and agencies below.
  if (!process.env.DATABASE_URL) {
    return staticRoutes;
  }

  const { prisma } = await import("@/lib/prisma");

  const [trips, agencies] = await Promise.all([
    prisma.groupTrip.findMany({
      where: { status: { in: ["PUBLISHED", "FULL"] }, isPublic: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.agency.findMany({
      where: { verificationStatus: "VERIFIED" },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const tripRoutes: MetadataRoute.Sitemap = trips.map((t) => ({
    url: `${url}/trip/${t.slug}`,
    lastModified: t.updatedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const agencyRoutes: MetadataRoute.Sitemap = agencies.map((a) => ({
    url: `${url}/agence/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...tripRoutes, ...agencyRoutes];
}
