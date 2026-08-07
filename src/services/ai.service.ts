import "server-only";

import { z } from "zod";
import { buildGroundingContext, getMarketplaceCatalogue } from "@/lib/trip-context";
import { missingRequiredFields, type AiFormData } from "@/lib/ai-match";
import type { GroupTrip } from "@/lib/types";

/**
 * Every LLM call in the application lives here (CDC §C.4: "Tout le code IA dans
 * un seul service", "Jamais d'appel IA directement depuis un composant UI").
 *
 * `server-only` makes that structural rather than a convention — importing this
 * from a client component is a build error, so GROQ_API_KEY can never be
 * bundled into the browser.
 *
 * Two responsibilities, kept separate exactly as §C splits them:
 *   1. structureRequest()  — §C.1, form answers → strict JSON. One LLM call.
 *   2. answerTripQuestion() — the grounded assistant. Retrieval-only: the model
 *      is handed a fact sheet built from real GroupTrip rows and told it may not
 *      use anything else.
 *
 * Neither throws. §C.3 makes the fallback mandatory — the user must never hit a
 * dead end because an upstream API was slow or down.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

/** §C.3: "Si l'IA échoue ou met > 5s" — the structuring budget. */
const STRUCTURE_TIMEOUT_MS = 5_000;
const ANSWER_TIMEOUT_MS = 12_000;

export interface StructuredRequest {
  summary: string;
  tags: string[];
  complexity: 1 | 2 | 3 | 4 | 5;
  destinationNormalized: string;
  budgetLevel: "low" | "medium" | "high" | "premium";
  dominantTripType: string;
}

export interface AssistantAnswer {
  answer: string;
  /** Trips whose facts were in the model's context, for "sources" in the UI. */
  cited: { title: string; slug: string }[];
  /** False when we fell back — lets the UI be honest about degraded mode. */
  grounded: boolean;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function logCall(kind: string, payload: Record<string, unknown>) {
  // §C.4: "Logs de chaque appel (pour améliorer les prompts)". Server-side only.
  console.info(`[ai.service:${kind}]`, JSON.stringify(payload));
}

/**
 * Single choke point for Groq. Times out, never throws, returns null on any
 * failure so callers are forced to have a fallback path.
 */
async function callGroq(
  messages: ChatMessage[],
  { timeoutMs, jsonMode = false }: { timeoutMs: number; jsonMode?: boolean }
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    logCall("config", { error: "GROQ_API_KEY missing — falling back" });
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: jsonMode ? 0 : 0.3,
        max_tokens: 700,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      logCall("http-error", { status: res.status, body: (await res.text()).slice(0, 300) });
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? null;
    logCall("ok", { ms: Date.now() - startedAt, chars: content?.length ?? 0 });
    return content;
  } catch (err) {
    logCall("failed", {
      ms: Date.now() - startedAt,
      reason: err instanceof Error ? err.name : "unknown",
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// §C.1 — request structuring
// ---------------------------------------------------------------------------

const STRUCTURE_SYSTEM = `Tu structures une demande de voyage au Maghreb (Maroc, Tunisie, Algérie).
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, à ce format exact :
{
  "summary": "résumé lisible en 2-3 phrases",
  "tags": ["tag-normalise", "..."],
  "complexity": 1,
  "destinationNormalized": "nom de lieu normalisé",
  "budgetLevel": "low",
  "dominantTripType": "DESERT"
}
Contraintes :
- "complexity" est un entier de 1 à 5.
- "budgetLevel" vaut exactement low, medium, high ou premium.
- "dominantTripType" vaut exactement DESERT, TREKKING, BEACH, CULTURAL, ADVENTURE, CITY_BREAK, GASTRONOMY ou PILGRIMAGE.
- "tags" contient 3 à 6 mots-clés en minuscules, sans accents.
- Corrige les fautes de frappe dans la destination ("tassil" -> "tassili").`;

const TRIP_TYPES = new Set([
  "DESERT", "TREKKING", "BEACH", "CULTURAL",
  "ADVENTURE", "CITY_BREAK", "GASTRONOMY", "PILGRIMAGE",
]);

const BUDGET_LEVELS = new Set(["low", "medium", "high", "premium"]);

/** Validates the model's JSON before it is trusted — never spread it raw. */
function parseStructured(raw: string): StructuredRequest | null {
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    const complexity = Number(p.complexity);
    const tripType = String(p.dominantTripType ?? "").toUpperCase();
    const budget = String(p.budgetLevel ?? "").toLowerCase();

    if (typeof p.summary !== "string" || !p.summary.trim()) return null;
    if (!Number.isInteger(complexity) || complexity < 1 || complexity > 5) return null;
    if (!TRIP_TYPES.has(tripType)) return null;
    if (!BUDGET_LEVELS.has(budget)) return null;

    return {
      summary: p.summary.trim(),
      tags: Array.isArray(p.tags) ? p.tags.map(String).slice(0, 8) : [],
      complexity: complexity as 1 | 2 | 3 | 4 | 5,
      destinationNormalized: String(p.destinationNormalized ?? "").trim(),
      budgetLevel: budget as StructuredRequest["budgetLevel"],
      dominantTripType: tripType,
    };
  } catch {
    return null;
  }
}

/**
 * §C.1 phase 1. Returns null when the model fails or exceeds the 5s budget —
 * the caller then runs phase 2's hard filters only, per §C.3.
 */
export async function structureRequest(formAnswers: Record<string, unknown>): Promise<StructuredRequest | null> {
  const raw = await callGroq(
    [
      { role: "system", content: STRUCTURE_SYSTEM },
      { role: "user", content: JSON.stringify(formAnswers) },
    ],
    { timeoutMs: STRUCTURE_TIMEOUT_MS, jsonMode: true }
  );

  if (!raw) return null;
  const parsed = parseStructured(raw);
  logCall("structure", { ok: parsed !== null });
  return parsed;
}

// ---------------------------------------------------------------------------
// Grounded assistant
// ---------------------------------------------------------------------------

/**
 * Two tiers, and the distinction is the whole point:
 *
 *  A. Anything about MaghrebVoyage itself — prices, dates, seats, agencies —
 *     comes ONLY from the retrieved CONTEXT. These are commitments the company
 *     has to honour, so an invented one is a real problem, not a bad answer.
 *  B. General Maghreb travel knowledge — cities, food, restaurants, culture,
 *     best season — the model may answer from its own knowledge, because the
 *     user explicitly asked for a travel expert rather than a catalogue robot.
 *     It must hedge, since that knowledge can be stale or wrong.
 *
 * Off-topic (outside the Maghreb) is still declined — that's what keeps this a
 * travel assistant instead of a general chatbot.
 */
const ASSISTANT_SYSTEM = `Tu es l'assistant expert de MaghrebVoyage, plateforme de voyages en groupe au Maroc, en Tunisie et en Algérie. Tu es à la fois un conseiller voyage passionné du Maghreb ET le guide du catalogue MaghrebVoyage.

Tu réponds à TOUTES les questions liées au Maghreb et au voyage : destinations, villes, culture, gastronomie, restaurants, artisanat, meilleures saisons, ambiance d'une région, idées d'itinéraires, conseils pratiques de voyage, budget indicatif sur place.

DEUX RÈGLES DE FIABILITÉ — ne les confonds jamais :

1) INFORMATIONS MAGHREBVOYAGE (prix d'un voyage, dates, places restantes, acompte, agences, ce qui est inclus) :
   uniquement à partir du bloc CONTEXTE ci-dessous. N'invente JAMAIS un prix, une date, une disponibilité,
   une agence ou un voyage. Si ce n'est pas dans le CONTEXTE, dis-le clairement.

2) CONNAISSANCES GÉNÉRALES SUR LE MAGHREB (villes, quartiers, plats, restaurants, marchés, culture,
   climat, saison idéale, coût de la vie sur place) : réponds VRAIMENT, avec des noms concrets et des
   exemples précis — c'est ce qui rend le conseil utile. Si on te demande les meilleurs restaurants
   d'une ville, cite des adresses ou des quartiers connus et dis ce qu'on y mange. Ne refuse pas de
   répondre sous prétexte que ça peut avoir changé.
   Ajoute simplement, en une courte phrase à la fin, que ces adresses sont des suggestions générales
   à vérifier sur place (horaires et tarifs évoluent) et qu'elles ne font pas partie des prestations
   MaghrebVoyage.

HORS SUJET : si la question ne concerne ni le Maghreb, ni le voyage, ni la plateforme (par exemple un
voyage au Japon, du code informatique, de la politique), dis gentiment que tu es spécialisé sur le
Maghreb et propose de revenir au voyage.

SANTÉ, VISAS, SÉCURITÉ : donne uniquement des repères généraux et recommande TOUJOURS de vérifier
auprès des autorités officielles ou de l'agence — ne présente jamais cela comme un conseil définitif.

STYLE :
- Réponds en français, ton chaleureux, concret et direct.
- 4 phrases maximum. Va à l'essentiel.
- Cite les prix et les dates du catalogue exactement comme dans le CONTEXTE.
- Quand tu mentionnes un voyage du catalogue, donne son titre exact.`;

/**
 * Same grounding contract as the text assistant, adapted for speech: no
 * markdown, shorter sentences, spoken numbers. Exported for the voice-context
 * route so typed and spoken answers stay governed by one set of rules.
 */
export const VOICE_AGENT_RULES = `Tu es l'assistant vocal expert de MaghrebVoyage, plateforme de voyages en groupe au Maroc, en Tunisie et en Algérie. Tu es un conseiller voyage passionné du Maghreb.

Tu réponds à TOUTES les questions liées au Maghreb et au voyage : villes, culture, gastronomie,
restaurants, meilleures saisons, ambiance d'une région, idées d'itinéraires, budget sur place.

DEUX RÈGLES DE FIABILITÉ — ne les confonds jamais :
1) INFOS MAGHREBVOYAGE (prix, dates, places restantes, acompte, agences) : uniquement à partir du
   catalogue ci-dessous. N'invente JAMAIS. Si ce n'est pas dans le catalogue, dis-le.
2) CONNAISSANCES GÉNÉRALES sur le Maghreb : réponds vraiment, avec des noms de lieux, de quartiers
   et de plats concrets — c'est ce qui rend le conseil utile. Ne refuse pas sous prétexte que ça peut
   avoir changé ; ajoute juste que c'est une suggestion à vérifier sur place.

HORS SUJET (hors Maghreb, hors voyage) : dis gentiment que tu es spécialisé sur le Maghreb.
VISAS, SANTÉ, SÉCURITÉ : repères généraux seulement, et recommande toujours de vérifier officiellement.

STYLE ORAL :
- Parle français, ton chaleureux et naturel.
- Deux phrases maximum par réponse : c'est une conversation, pas une fiche.
- Dis les prix à voix haute ("quatre cent quatre-vingts euros"), jamais de symboles ni de markdown.
- Termine en proposant la suite : préciser un critère, ou réserver.

TA MISSION PRINCIPALE : guider la personne, un sujet à la fois, pour recueillir son projet de voyage :
destination souhaitée, dates ou durée, nombre de voyageurs, budget, type de voyage (désert, trekking,
plage, culture, aventure, ville, gastronomie ou pèlerinage), puis son nom et son email. Ne demande
qu'une seule information à la fois, dans un ordre naturel. Une fois ces informations réunies, dis-lui
qu'elle peut consulter le récapitulatif à l'écran et voir ses voyages recommandés.

IMPORTANT : ne demande JAMAIS son consentement RGPD ni son acceptation des CGU à voix haute — ce sont
des cases à cocher que la personne doit cliquer elle-même dans l'application, jamais par la parole.`;

/** Deterministic fallback when the LLM is unavailable — never a dead end (§C.3). */
function fallbackAnswer(cited: GroupTrip[]): AssistantAnswer {
  const first = cited[0];
  const answer = first
    ? `Je ne peux pas répondre en détail pour le moment. En attendant, « ${first.title} » part de ${first.destination} — vous trouverez toutes les informations sur sa page.`
    : `Je ne peux pas répondre pour le moment. Parcourez les voyages disponibles pour trouver votre départ.`;
  return {
    answer,
    cited: cited.map((t) => ({ title: t.title, slug: t.slug })),
    grounded: false,
  };
}

/**
 * Answers a traveller's question strictly from catalogue data.
 * Structured never to throw: any upstream failure degrades to `fallbackAnswer`.
 */
export async function answerTripQuestion(
  question: string,
  history: ChatMessage[] = []
): Promise<AssistantAnswer> {
  const trimmed = question.trim().slice(0, 2000);
  const { context, cited } = await buildGroundingContext(trimmed);

  const raw = await callGroq(
    [
      { role: "system", content: ASSISTANT_SYSTEM },
      // Keep the last few turns so follow-ups like "et le suivant ?" work.
      ...history.slice(-12),
      { role: "user", content: `CONTEXTE :\n${context}\n\nQUESTION : ${trimmed}` },
    ],
    { timeoutMs: ANSWER_TIMEOUT_MS }
  );

  if (!raw?.trim()) return fallbackAnswer(cited);

  return {
    answer: raw.trim(),
    cited: cited.map((t) => ({ title: t.title, slug: t.slug })),
    grounded: true,
  };
}

// ---------------------------------------------------------------------------
// Conversational slot-filling — talking alone drives the 5-step planner
// ---------------------------------------------------------------------------

const TRIP_TYPE_VALUES = [
  "DESERT", "TREKKING", "BEACH", "CULTURAL",
  "ADVENTURE", "CITY_BREAK", "GASTRONOMY", "PILGRIMAGE",
] as const;

/**
 * Every field the model is allowed to touch, and nothing else. `.partial()`
 * because a single turn ("deux semaines à Marrakech") only ever fills a few
 * of these — anything the model omits is left untouched by the caller.
 *
 * Deliberately excludes gdprConsent/termsAccepted — see the comment on
 * ASSISTANT_FILLABLE_KEYS in lib/ai-match.ts for why those stay manual.
 */
const SlotsSchema = z
  .object({
    destination: z.string().max(120),
    dateFlexible: z.boolean(),
    exactStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    exactEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    // The wizard's inputs bind these as strings, but a model asked to extract
    // "5 jours" or "2 adultes" naturally answers with a JSON number — coerce
    // rather than reject, then still enforce the shape those inputs expect.
    desiredDurationDays: z.coerce.string().regex(/^\d{1,3}$/),
    travelerCount: z.coerce.string().regex(/^\d{1,2}$/),
    adults: z.coerce.string().regex(/^\d{1,2}$/),
    children: z.coerce.string().regex(/^\d{1,2}$/),
    budgetMax: z.coerce.number().int().min(50).max(20000),
    tripTypes: z.array(z.enum(TRIP_TYPE_VALUES)).max(8),
    style: z.string().max(120),
    accommodation: z.string().max(120),
    transportIncluded: z.boolean(),
    activities: z.string().max(300),
    constraints: z.string().max(500),
    language: z.string().max(60),
    name: z.string().max(120),
    email: z.string().email(),
    phone: z.string().max(40),
    country: z.string().max(80),
  })
  .partial();

const ConverseResponseSchema = z.object({
  reply: z.string().max(600),
  // The model returns {} when nothing new was said — validated the same way
  // as a full payload rather than special-cased, so a malformed partial can't
  // sneak an invalid field past the schema.
  slots: SlotsSchema.default({}),
  readyToSubmit: z.boolean().default(false),
});

export interface ConverseResult {
  reply: string;
  slots: Partial<AiFormData>;
  readyToSubmit: boolean;
  cited: { title: string; slug: string }[];
  grounded: boolean;
}

const FIELD_QUESTIONS: Record<string, string> = {
  destination: "quelle destination les intéresse",
  desiredDurationDays: "combien de jours ils souhaitent partir",
  exactStartDate: "leur date de départ",
  exactEndDate: "leur date de retour",
  travelerCount: "combien de voyageurs au total",
  adults: "combien d'adultes",
  tripTypes: "quel type de voyage ils recherchent (désert, trekking, plage, culture, aventure, ville, gastronomie ou pèlerinage)",
  name: "son nom",
  email: "son email",
};

function converseSystemPrompt(missing: string[]): string {
  const nextAsk = missing[0] ? FIELD_QUESTIONS[missing[0]] : null;

  return `Tu es l'assistant IA de MaghrebVoyage. Tu aides un voyageur à remplir sa demande de voyage EN PARLANT, sans qu'il touche le formulaire.

Ta tâche à CHAQUE message :
1. Extrais tout ce que le message révèle parmi : destination, dateFlexible (true si dates flexibles/pas de date précise), exactStartDate/exactEndDate (format AAAA-MM-JJ, uniquement si des dates précises sont données), desiredDurationDays (nombre de jours, si dates flexibles), travelerCount, adults, children (nombres), budgetMax (nombre, en euros), tripTypes (uniquement parmi : DESERT, TREKKING, BEACH, CULTURAL, ADVENTURE, CITY_BREAK, GASTRONOMY, PILGRIMAGE), style, accommodation, transportIncluded (booléen), activities, constraints, language, name, email, phone, country.

   RÈGLES D'EXTRACTION — applique-les strictement :
   • budgetMax est TOUJOURS un budget PAR PERSONNE. « 800 euros chacun », « 800 € par personne » et
     « on a 800 euros chacun » donnent tous budgetMax = 800. Ne multiplie JAMAIS par le nombre de
     voyageurs. Si la personne donne clairement un budget TOTAL pour le groupe (« 1600 € en tout
     pour deux »), divise par le nombre de voyageurs pour obtenir le budget par personne.
   • destination accepte un pays aussi bien qu'une ville : « au Maroc » donne destination = "Maroc",
     « à Marrakech » donne "Marrakech". Remplis-la dès qu'un lieu est cité, même vague.
   • « avec ma femme / mon mari » = 2 voyageurs, 2 adultes, 0 enfant. « en famille » sans chiffre ne
     suffit pas : demande combien.
   • Corrige les fautes de frappe des lieux (« tassil » → « Tassili »).
   • tripTypes : traduis les mots du voyageur vers les valeurs autorisées, dès qu'il exprime une
     envie — n'attends pas qu'il emploie le mot exact.
       désert, dunes, Sahara, bivouac, méharée      → DESERT
       trek, randonnée, montagne, Atlas, sommet     → TREKKING
       plage, mer, farniente, surf, balnéaire       → BEACH
       culture, médina, histoire, patrimoine, musée → CULTURAL
       aventure, sensations, 4x4, sport             → ADVENTURE
       city-break, week-end en ville, Marrakech seule→ CITY_BREAK
       gastronomie, cuisine, cours de cuisine       → GASTRONOMY
       pèlerinage, spirituel, religieux             → PILGRIMAGE
     « je veux partir dans le désert » donne donc tripTypes = ["DESERT"], immédiatement.
2. Si le message pose une question factuelle sur les voyages existants, réponds-y dans "reply" EN TE BASANT UNIQUEMENT sur le CONTEXTE fourni. Sans invention de prix, dates ou voyages.
3. Ne mets dans "slots" QUE les champs que le message vient d'apporter. Ne répète jamais un champ déjà connu.
4. Ne demande JAMAIS le consentement RGPD ou l'acceptation des CGU : ce sont des cases à cocher manuellement, jamais par la parole.
${nextAsk ? `5. Il manque encore une information : ${nextAsk}. Pose UNE SEULE question claire et courte pour l'obtenir dans "reply" (sauf si le message répond justement à une question factuelle — dans ce cas, réponds d'abord, puis pose la question).

6. RECOMMANDE DÈS QUE POSSIBLE — mais UNIQUEMENT un voyage dont le titre apparaît TEL QUEL,
   mot pour mot, sur une ligne "TITRE:" du bloc CONTEXTE VOYAGES.
   INTERDIT ABSOLU : inventer un titre, le reformuler, le traduire, l'embellir, ou fabriquer un
   titre à partir d'un nom de lieu ou d'une étape du programme. Les étapes du PROGRAMME ne sont PAS
   des voyages. Si aucun titre du CONTEXTE ne convient, ne recommande rien du tout et contente-toi
   de poser ta question — c'est toujours mieux qu'un voyage qui n'existe pas.
   Ne recommande jamais un voyage dont le STATUT indique qu'il est complet : dis-le en une
   demi-phrase et propose à la place un autre titre du CONTEXTE encore disponible.
   Ne répète pas la même recommandation à chaque tour : si tu l'as déjà citée, passe à ta question.` : `5. Toutes les informations nécessaires sont réunies. Fais trois choses dans "reply", en 4 phrases maximum :
   a) résume en une phrase ce que tu as compris de son projet ;
   b) RECOMMANDE le voyage du CONTEXTE qui correspond le mieux, par son titre exact, et explique
      POURQUOI en citant les critères qui collent (destination, type, budget, durée). Si le meilleur
      voyage dépasse son budget ou ne dure pas le nombre de jours demandé, dis-le franchement ;
   c) invite-la à cocher les deux cases obligatoires du récapitulatif pour voir la sélection complète.
   Mets "readyToSubmit" à true.`}

Réponds UNIQUEMENT en JSON strict, sans texte autour :
{ "reply": string, "slots": { ... }, "readyToSubmit": boolean }`;
}

/**
 * One call, two jobs: extract whatever the message reveals about the trip
 * the traveller wants, and — if the message was also a question — answer it
 * from the same grounding context as answerTripQuestion(). Structured never
 * to throw: on any failure this returns an empty, ungrounded turn rather than
 * blocking the conversation (§C.3's "never a dead end" applies here too).
 */
export async function converseForSlots(
  message: string,
  history: ChatMessage[],
  currentForm: AiFormData
): Promise<ConverseResult> {
  const trimmed = message.trim().slice(0, 2000);
  const missing = missingRequiredFields(currentForm);
  const { context, cited } = await buildGroundingContext(trimmed);

  const fallback: ConverseResult = {
    reply:
      "Je n'ai pas pu traiter votre message pour le moment. Vous pouvez continuer à remplir le formulaire directement.",
    slots: {},
    readyToSubmit: false,
    cited: [],
    grounded: false,
  };

  const raw = await callGroq(
    [
      { role: "system", content: converseSystemPrompt(missing) },
      ...history.slice(-12),
      {
        role: "user",
        content: `ÉTAT ACTUEL DU FORMULAIRE : ${JSON.stringify(currentForm)}\n\nCONTEXTE VOYAGES :\n${context}\n\nMESSAGE DU VOYAGEUR : ${trimmed}`,
      },
    ],
    { timeoutMs: ANSWER_TIMEOUT_MS, jsonMode: true }
  );

  if (!raw) return fallback;

  const parsed = ConverseResponseSchema.safeParse(tryParseJson(raw));
  if (!parsed.success) {
    logCall("converse-invalid", { issues: parsed.error.issues.slice(0, 3) });
    return fallback;
  }

  return {
    reply: await stripInventedTripTitles(parsed.data.reply),
    slots: parsed.data.slots,
    readyToSubmit: parsed.data.readyToSubmit,
    cited: cited.map((t) => ({ title: t.title, slug: t.slug })),
    grounded: true,
  };
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Last line of defence against a fabricated trip.
 *
 * Asking the model to recommend proactively measurably weakened its grounding:
 * it produced «Désert Marocain : Dunes de Merzouga», a plausible title stitched
 * together from a real trip's programme steps. A prompt rule alone can't be
 * trusted for something a traveller might try to book, so any quoted title that
 * doesn't match a real trip is rewritten out of the reply rather than shown.
 *
 * Deliberately conservative: it only touches quoted spans, because unquoted
 * place names ("le Sahara", "Merzouga") are legitimate prose.
 */
async function stripInventedTripTitles(reply: string): Promise<string> {
  const { trips } = await getMarketplaceCatalogue();
  const realTitles = new Set(trips.map((t) => t.title.toLowerCase().trim()));
  // Matches «…», "…" and '…'.
  //
  // The lookbehind matters: French elides with an apostrophe (d', l', s', qu'),
  // so a naive '…' pattern reads "il s'agit d'un trek, pas d'un désert" as a
  // quoted span and mangles the sentence. A real opening quote is never
  // directly preceded by a letter.
  const quoted = /(?:«([^»]{8,120})»|"([^"]{8,120})"|(?<![\p{L}])'([^']{8,120})')/gu;

  let sanitized = reply;
  let hit: RegExpExecArray | null;
  const invented: string[] = [];

  while ((hit = quoted.exec(reply)) !== null) {
    // Whichever alternative matched — «», "" or ''.
    const candidate = (hit[1] ?? hit[2] ?? hit[3] ?? "").trim();
    // Only judge things that look like a trip title being offered, not any
    // quoted fragment — a real title is always multi-word.
    if (!/\s/.test(candidate)) continue;
    if (realTitles.has(candidate.toLowerCase())) continue;
    invented.push(candidate);
  }

  if (invented.length === 0) return reply;

  logCall("hallucinated-title", { invented });
  for (const bad of invented) {
    const escaped = bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Swallow any article in front of the quote too, otherwise the rewrite
    // reads "le un de nos voyages". Delimiters are included in the match so no
    // stray quote is left mid-sentence.
    sanitized = sanitized.replace(
      new RegExp(`(?:\\b(?:les|le|la|du|des|au)\\s+)?(?:«${escaped}»|"${escaped}"|'${escaped}')`, "gi"),
      "un de nos voyages"
    );
  }
  return sanitized;
}
