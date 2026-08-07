import { NextResponse } from "next/server";
import { answerTripQuestion } from "@/services/ai.service";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * The assistant's only entry point from the browser.
 *
 * The Groq key never leaves the server: the client posts a question, this route
 * builds the grounding context and calls the model. CDC §5.3 — "Toutes les
 * routes API validées côté serveur".
 */

export const runtime = "nodejs";

// An abuse brake rather than a usage cap — see the note in ../converse/route.ts.
const MAX_PER_MINUTE = 120;
const WINDOW_SECONDS = 60;

interface AskBody {
  question?: unknown;
  history?: unknown;
}

export async function POST(request: Request) {
  const ip = clientIp(request);

  // Redis-backed so the limit holds across serverless instances.
  const limit = await rateLimit(`ai:ask:${ip}`, MAX_PER_MINUTE, WINDOW_SECONDS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Trop de questions d'affilée. Réessayez dans une minute." },
      { status: 429, headers: { "Retry-After": String(WINDOW_SECONDS) } }
    );
  }

  let body: AskBody;
  try {
    body = (await request.json()) as AskBody;
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (question.length < 2) {
    return NextResponse.json({ error: "Question vide." }, { status: 400 });
  }
  if (question.length > 2000) {
    return NextResponse.json({ error: "Question trop longue (2000 caractères max)." }, { status: 400 });
  }

  // Only the two roles the model expects, and only recent turns.
  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            typeof m === "object" &&
            m !== null &&
            (("role" in m && (m as { role: unknown }).role === "user") ||
              ("role" in m && (m as { role: unknown }).role === "assistant")) &&
            "content" in m &&
            typeof (m as { content: unknown }).content === "string"
        )
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    : [];

  // answerTripQuestion never throws — it degrades instead (§C.3).
  const result = await answerTripQuestion(question, history);
  return NextResponse.json(result);
}
