import { NextResponse } from "next/server";
import { converseForSlots } from "@/services/ai.service";
import { EMPTY_AI_FORM, type AiFormData } from "@/lib/ai-match";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { routing } from "@/i18n/routing";

/**
 * Powers the AI planner's "just talk" mode: each turn is extracted into form
 * fields server-side (CDC §5.3 — every route validates its own input; the
 * client's `form` is trusted only as a starting point, never merged in raw).
 */

export const runtime = "nodejs";

/**
 * Deliberately high: during a voice call every user utterance also hits this
 * endpoint for slot extraction, so a normal back-and-forth conversation can
 * fire many times a minute. This is an abuse brake, not a usage cap — no real
 * person types or talks fast enough to reach it.
 *
 * Not removed entirely on purpose: this endpoint spends money per call, and an
 * unthrottled public endpoint is how a single script drains an LLM budget
 * overnight. Groq's own 12k tokens/minute free-tier ceiling will be hit long
 * before this one anyway.
 */
const MAX_PER_MINUTE = 120;
const WINDOW_SECONDS = 60;

/** Same whitelist the service validates against — belt and suspenders against a malformed client payload reaching the model at all. */
const FORM_KEYS = new Set(Object.keys(EMPTY_AI_FORM));

function sanitizeForm(input: unknown): AiFormData {
  if (typeof input !== "object" || input === null) return EMPTY_AI_FORM;
  const out = { ...EMPTY_AI_FORM };
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!FORM_KEYS.has(key)) continue;
    // Only accept values whose type already matches the default's — refuses
    // e.g. a string where EMPTY_AI_FORM has a boolean, without a full schema.
    const defaultValue = (EMPTY_AI_FORM as unknown as Record<string, unknown>)[key];
    if (typeof value === typeof defaultValue || Array.isArray(defaultValue)) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

interface ConverseBody {
  message?: unknown;
  history?: unknown;
  form?: unknown;
  locale?: unknown;
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = await rateLimit(`ai:converse:${ip}`, MAX_PER_MINUTE, WINDOW_SECONDS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Trop de messages d'affilée. Réessayez dans une minute." },
      { status: 429, headers: { "Retry-After": String(WINDOW_SECONDS) } }
    );
  }

  let body: ConverseBody;
  try {
    body = (await request.json()) as ConverseBody;
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 1 || message.length > 2000) {
    return NextResponse.json({ error: "Message invalide." }, { status: 400 });
  }

  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            typeof m === "object" &&
            m !== null &&
            "role" in m &&
            ((m as { role: unknown }).role === "user" || (m as { role: unknown }).role === "assistant") &&
            "content" in m &&
            typeof (m as { content: unknown }).content === "string"
        )
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    : [];

  const form = sanitizeForm(body.form);
  const locale =
    typeof body.locale === "string" &&
    routing.locales.includes(body.locale as (typeof routing.locales)[number])
      ? body.locale
      : routing.defaultLocale;

  const result = await converseForSlots(message, history, form, locale);
  return NextResponse.json(result);
}
