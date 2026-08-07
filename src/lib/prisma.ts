import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

/**
 * Prisma singleton (CDC §5.2 "prisma.ts → instance singleton").
 *
 * The globalThis cache is not a micro-optimisation — Next's dev server reloads
 * modules on every edit, and a fresh PrismaClient per reload opens a new
 * connection pool each time until Postgres refuses new connections. In
 * production the module is evaluated once and the cache is inert.
 *
 * Prisma 7 requires a driver adapter rather than a `url` in the schema.
 */

const connectionString = process.env.DATABASE_URL;

function createClient() {
  if (!connectionString) {
    // Thrown lazily on first use rather than at import time, so that routes
    // which don't touch the database still work before the DB is provisioned.
    throw new Error(
      "DATABASE_URL is not set. Add the Postgres connection string to .env.local " +
        "(Supabase → Project Settings → Database → Connection string → URI)."
    );
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    // Slow queries and errors are worth seeing in dev; production stays quiet
    // so request logs aren't drowned out.
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createClient> | undefined;
};

function getClient() {
  if (!globalForPrisma.prisma) {
    const client = createClient();
    // In production the module is evaluated once, so caching on globalThis is
    // harmless; in dev it's what stops each hot reload opening a new pool.
    globalForPrisma.prisma = client;
  }
  return globalForPrisma.prisma;
}

/**
 * Lazily constructed on first property access.
 *
 * This indirection is load-bearing: `next build` imports every route module to
 * collect page data, so constructing the client at module scope made the whole
 * build fail with "DATABASE_URL is not set" on machines where the database
 * isn't configured yet. Deferring to first *use* means a route that never
 * touches the database builds and runs fine, and one that does fails with a
 * clear message at request time instead of taking the build down.
 */
export const prisma = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
