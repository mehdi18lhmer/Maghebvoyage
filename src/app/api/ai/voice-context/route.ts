import { NextResponse } from "next/server";
import { buildFullCatalogueContext } from "@/lib/trip-context";
import { VOICE_AGENT_RULES } from "@/services/ai.service";

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

export async function GET() {
  const prompt = `${VOICE_AGENT_RULES}\n\n${await buildFullCatalogueContext()}`;
  return NextResponse.json(
    { prompt },
    { headers: { "Cache-Control": "public, max-age=60" } }
  );
}
