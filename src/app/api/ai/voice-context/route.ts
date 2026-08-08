import { NextResponse } from "next/server";
import { buildFullCatalogueContext } from "@/lib/trip-context";
import { voiceAgentPrompt } from "@/services/ai.service";
import { routing } from "@/i18n/routing";

/**
 * System prompt for the Vapi voice agent.
 *
 * Voice can't do per-question retrieval mid-call the way the text endpoint
 * does, so the whole catalogue is baked into the agent's system prompt at call
 * start. Same grounding rules, same facts — a spoken answer can't drift from a
 * typed one.
 *
 * Everything returned here is public catalogue data, so it is safe to hand to
 * the browser. No key is exposed: Vapi is started with the *public* key.
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("locale");
  const locale =
    requested && routing.locales.includes(requested as (typeof routing.locales)[number])
      ? requested
      : routing.defaultLocale;

  const prompt = `${voiceAgentPrompt(locale)}\n\n${await buildFullCatalogueContext()}`;
  return NextResponse.json(
    { prompt },
    { headers: { "Cache-Control": "public, max-age=60" } }
  );
}
