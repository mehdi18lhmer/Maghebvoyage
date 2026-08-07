import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 config. Connection URLs live here rather than in schema.prisma.
 *
 * Two URLs, and the distinction matters on Supabase:
 *  - DATABASE_URL points at the pooler (port 6543). Serverless functions open
 *    and drop connections constantly; without the pooler Postgres runs out of
 *    connection slots.
 *  - DIRECT_URL points at the database directly (port 5432). Migrations need
 *    it because the transaction pooler can't run the DDL and advisory locks
 *    that `migrate` relies on.
 *
 * DIRECT_URL falls back to DATABASE_URL so a plain non-pooled Postgres (local
 * docker, Neon direct) works with only one variable set.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // This file configures the Prisma CLI only (migrate / db push / studio),
    // so it takes the DIRECT connection: the transaction pooler can't run the
    // DDL and advisory locks migrations need. The runtime client is separate
    // and uses the pooled DATABASE_URL via its driver adapter — see
    // src/lib/prisma.ts.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
