import { NextResponse } from "next/server";
import { matchTrips, EMPTY_AI_FORM, type AiFormData } from "@/lib/ai-match";
import { getMarketplaceCatalogue } from "@/lib/trip-context";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Phase 2 of CDC §C.2 (the pure-SQL matching pass), run server-side because
 * `matchTrips()` needs real `GroupTrip`/`Agency` rows and Prisma can't run in
 * the browser. The client (`useAiFormState`) posts its in-progress form here
 * instead of calling `matchTrips()` locally.
 */

export const runtime = "nodejs";

const MAX_PER_MINUTE = 30;
const WINDOW_SECONDS = 60;

const FORM_KEYS = new Set(Object.keys(EMPTY_AI_FORM));

function sanitizeForm(input: unknown): AiFormData {
  if (typeof input !== "object" || input === null) return EMPTY_AI_FORM;
  const out = { ...EMPTY_AI_FORM };
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!FORM_KEYS.has(key)) continue;
    const defaultValue = (EMPTY_AI_FORM as unknown as Record<string, unknown>)[key];
    if (typeof value === typeof defaultValue || Array.isArray(defaultValue)) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = await rateLimit(`ai:match:${ip}`, MAX_PER_MINUTE, WINDOW_SECONDS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Trop de recherches. Réessayez dans une minute." },
      { status: 429, headers: { "Retry-After": String(WINDOW_SECONDS) } }
    );
  }

  let body: { form?: unknown };
  try {
    body = (await request.json()) as { form?: unknown };
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const form = sanitizeForm(body.form);
  const { trips, agencies } = await getMarketplaceCatalogue();
  const result = matchTrips(trips, agencies, form);

  const agencyNames = Object.fromEntries(agencies.map((a) => [a.id, a.name]));

  return NextResponse.json({ ...result, agencyNames });
}
