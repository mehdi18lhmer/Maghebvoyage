import "server-only";

import { Redis } from "@upstash/redis";

/**
 * Fixed-window rate limiting, backed by Upstash.
 *
 * The reason this can't be a `Map` in module scope: on Vercel every serverless
 * instance gets its own memory, so an in-process counter lets an attacker
 * multiply their allowance by however many instances happen to be warm. The
 * CDC's "5 tentatives / IP / heure" (§10) is only meaningful against shared
 * state.
 *
 * Degrades to an in-process counter when Redis isn't configured, so local
 * development works without credentials — but that path is explicitly weaker
 * and says so in its return value.
 */

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowSec: number) {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now > entry.resetAt) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1, shared: false };
  }
  entry.count += 1;
  return { ok: entry.count <= limit, remaining: Math.max(0, limit - entry.count), shared: false };
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** False when we fell back to per-instance memory — the weaker guarantee. */
  shared: boolean;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const client = getRedis();
  if (!client) return memoryLimit(key, limit, windowSec);

  try {
    // INCR then EXPIRE-on-first-hit is the standard fixed window. The two
    // commands are pipelined so the window is always set for a fresh key.
    const pipeline = client.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    const [count, ttl] = (await pipeline.exec()) as [number, number];

    if (ttl < 0) {
      // Key had no expiry (first hit, or a previous crash lost it) — set one,
      // otherwise the counter would never reset and lock the caller out.
      await client.expire(key, windowSec);
    }

    return { ok: count <= limit, remaining: Math.max(0, limit - count), shared: true };
  } catch {
    // Never let the limiter take the endpoint down with it.
    return memoryLimit(key, limit, windowSec);
  }
}

/** Best-effort client IP, for use as a limiter key. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local"
  );
}
