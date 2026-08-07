import type { PhysicalLevel } from "@/generated/prisma";

/**
 * Bridges the wizard's 1–5 UI scale and Prisma's `PhysicalLevel` enum. Split
 * out of db-mappers.ts (which is `server-only`) because the publish wizard is
 * a client component and needs this exact same mapping when it submits.
 */
export function physicalLevelFromNumber(n: number): PhysicalLevel {
  if (n <= 1) return "EASY";
  if (n === 2) return "MEDIUM";
  if (n >= 4) return "SPORT";
  return n === 5 ? "EXPERT" : "MEDIUM";
}
