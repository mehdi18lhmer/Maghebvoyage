import "server-only";

import { TripStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { mapAgency, mapTrip } from "@/lib/db-mappers";
import { formatDateRange, formatPrice, seatsRemaining, tripTypeLabel } from "@/lib/format";
import type { Agency, GroupTrip } from "@/lib/types";

/**
 * Retrieval layer for the assistant.
 *
 * The LLM is never allowed to answer from its own knowledge — it only ever sees
 * the fact sheet built here, assembled from real `GroupTrip` rows read straight
 * from Postgres. That is what makes "grounded" true rather than aspirational:
 * if a number isn't in this context, the model has no way to state it.
 *
 * `server-only` because this file talks to Prisma directly — it must never be
 * importable from a client component (the LLM calls that use it already live
 * in `ai.service.ts`, itself `server-only`, but this is defense in depth).
 */

/** Every bookable trip + its agency, fetched once and reused by every helper below. */
async function loadCatalogue(): Promise<{ trips: GroupTrip[]; agencies: Map<string, Agency> }> {
  const rows = await prisma.groupTrip.findMany({
    where: { status: { in: [TripStatus.PUBLISHED, TripStatus.FULL] } },
    include: { agency: true },
    orderBy: { startDate: "asc" },
  });

  const agencies = new Map<string, Agency>();
  for (const row of rows) {
    if (!agencies.has(row.agencyId)) agencies.set(row.agencyId, mapAgency(row.agency));
  }

  return { trips: rows.map(mapTrip), agencies };
}

/** Same catalogue, exposed for callers that need real trips+agencies together (e.g. the match route). */
export async function getMarketplaceCatalogue(): Promise<{ trips: GroupTrip[]; agencies: Agency[] }> {
  const { trips, agencies } = await loadCatalogue();
  return { trips, agencies: [...agencies.values()] };
}

/** Lowercase + strip accents, so "désert" matches "desert" and "Algérie" matches "algerie". */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const STOP_WORDS = new Set([
  "le", "la", "les", "un", "une", "des", "du", "de", "et", "ou", "a", "au", "aux",
  "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "pour", "avec", "sur",
  "dans", "est", "sont", "quel", "quelle", "quels", "quelles", "combien", "que",
  "qui", "quoi", "comment", "ce", "cette", "ces", "en", "y", "me", "mon", "ma",
  "mes", "votre", "vos", "the", "is", "are", "what", "how", "much", "many",
]);

function tokens(input: string): string[] {
  return normalize(input)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

/**
 * Picks the trips a question is plausibly about. Deliberately generous — it is
 * far better to hand the model three trips too many than to omit the one the
 * traveller meant and have it answer from nothing.
 */
function selectRelevantTrips(
  question: string,
  catalogue: GroupTrip[],
  agencies: Map<string, Agency>,
  limit = 4
): GroupTrip[] {
  const qTokens = tokens(question);

  if (qTokens.length === 0) return catalogue.slice(0, limit);

  const scored = catalogue.map((trip) => {
    const agency = agencies.get(trip.agencyId);
    const haystack = normalize(
      [
        trip.title,
        trip.destination,
        tripTypeLabel(trip.tripType),
        trip.description,
        trip.meetingPoint,
        agency?.name ?? "",
        agency?.zones.join(" ") ?? "",
        trip.aiTags.join(" "),
        trip.inclusions.join(" "),
      ].join(" ")
    );
    const score = qTokens.reduce((sum, t) => (haystack.includes(t) ? sum + 1 : sum), 0);
    return { trip, score };
  });

  const hits = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

  // No keyword landed (e.g. "c'est quoi l'acompte ?") — hand over the soonest
  // departures so the model still has real data to ground a general answer in.
  if (hits.length === 0) {
    return [...catalogue]
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, limit);
  }

  return hits.slice(0, limit).map((s) => s.trip);
}

/** One trip rendered as plain facts. Everything here is verifiable from the row. */
function tripFacts(trip: GroupTrip, agencies: Map<string, Agency>): string {
  const agency = agencies.get(trip.agencyId);
  const remaining = seatsRemaining(trip.totalSpots, trip.bookedSpots);
  const balance = trip.totalPrice - trip.depositAmount;

  const lines = [
    `TITRE: ${trip.title}`,
    `LIEN: /trip/${trip.slug}`,
    `DESTINATION: ${trip.destination}`,
    `PAYS: ${agency?.zones.join(", ") ?? "non précisé"}`,
    `TYPE: ${tripTypeLabel(trip.tripType)}`,
    `DATES: ${formatDateRange(trip.startDate, trip.endDate)} (${trip.durationDays} jours)`,
    `PRIX TOTAL PAR PERSONNE: ${formatPrice(trip.totalPrice)}`,
    `ACOMPTE EN LIGNE: ${formatPrice(trip.depositAmount)}`,
    `SOLDE À RÉGLER SUR PLACE: ${formatPrice(balance)}`,
    `PLACES: ${remaining} restantes sur ${trip.totalSpots}`,
    `STATUT: ${trip.status === "FULL" ? "COMPLET — réservation impossible" : trip.status}`,
    `NIVEAU PHYSIQUE: ${trip.physicalLevel}/5`,
    `POINT DE RENDEZ-VOUS: ${trip.meetingPoint || "non précisé"}`,
    `AGENCE: ${agency?.name ?? "non précisée"}${agency?.verificationStatus === "VERIFIED" ? " (vérifiée)" : ""}`,
    `INCLUS: ${trip.inclusions.length ? trip.inclusions.join(" ; ") : "non précisé"}`,
    `NON INCLUS: ${trip.exclusions.length ? trip.exclusions.join(" ; ") : "non précisé"}`,
    `DESCRIPTION: ${trip.description}`,
  ];

  if (trip.program.length > 0) {
    lines.push(
      `PROGRAMME: ${trip.program.map((p) => `J${p.day} — ${p.title}: ${p.detail}`).join(" | ")}`
    );
  }

  return lines.join("\n");
}

/** The full context block handed to the model for a given question. */
export async function buildGroundingContext(
  question: string
): Promise<{ context: string; cited: GroupTrip[] }> {
  const { trips: catalogue, agencies } = await loadCatalogue();
  const cited = selectRelevantTrips(question, catalogue, agencies);

  const header = [
    `CATALOGUE: ${catalogue.length} voyages réservables au total.`,
    `PAYS COUVERTS: ${[...new Set([...agencies.values()].flatMap((a) => a.zones))].join(", ")}.`,
    `RÈGLE DE PAIEMENT DE LA PLATEFORME: le client règle en ligne un acompte par carte via Stripe ; le solde se règle directement auprès de l'agence, sur place. Aucun compte n'est nécessaire pour réserver. L'annulation se fait via un lien personnel envoyé par email.`,
  ].join("\n");

  const body = cited.map((t) => tripFacts(t, agencies)).join("\n---\n");

  return { context: `${header}\n\n=== VOYAGES ===\n${body}`, cited };
}

/** Trips currently sold out — used to answer availability without guessing. */
export async function soldOutTrips(): Promise<GroupTrip[]> {
  const { trips } = await loadCatalogue();
  return trips.filter((t) => t.status === "FULL");
}

/**
 * The entire bookable catalogue as one fact sheet.
 *
 * Used for the voice agent, which can't do per-question retrieval mid-call:
 * it gets everything up front so it is grounded by construction. Viable only
 * because the catalogue is small — if it outgrows the context window, voice
 * has to move to a tool-call/custom-LLM setup that queries per turn.
 */
export async function buildFullCatalogueContext(): Promise<string> {
  const { trips: catalogue, agencies } = await loadCatalogue();
  const countries = [...new Set([...agencies.values()].flatMap((a) => a.zones))];

  const header = [
    `CATALOGUE COMPLET : ${catalogue.length} voyages réservables.`,
    `PAYS COUVERTS : ${countries.join(", ")}.`,
    `PAIEMENT : acompte en ligne par carte (Stripe), solde réglé sur place auprès de l'agence. Aucun compte requis. Annulation via un lien personnel envoyé par email.`,
  ].join("\n");

  return `${header}\n\n=== VOYAGES ===\n${catalogue.map((t) => tripFacts(t, agencies)).join("\n---\n")}`;
}
