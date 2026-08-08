import { formatPrice } from "./format";
import type { Agency, GroupTrip, TripType } from "./types";

/**
 * Minimal shape of next-intl's translator — kept loose rather than importing
 * next-intl's own type, so this file stays framework-agnostic (see the note
 * below on why it can't import Prisma either). The caller builds the real
 * thing via `getTranslations({ locale, namespace: "AiMatch" })` server-side.
 */
type Translator = (key: string, values?: Record<string, string | number>) => string;
/** Separate namespace for trip-type labels — same translator shape. */
type TypeTranslator = (key: TripType) => string;

/**
 * CDC §C.2's weighted scoring engine — deliberately data-source-agnostic.
 *
 * This file is imported into a CLIENT component (use-ai-form-state.ts calls
 * `matchTrips()` from the browser), so it can never import Prisma directly —
 * Prisma cannot run outside Node, and even if it somehow bundled, that would
 * ship database credentials into client JS. Every function here instead takes
 * `trips`/`agencies` as plain parameters. The caller decides where the data
 * comes from: `POST /api/ai/match` fetches real rows via Prisma server-side
 * and maps them through db-mappers.ts before calling in; nothing in this file
 * needs to know that happened.
 */

export interface AiFormData {
  destination: string;
  dateFlexible: boolean;
  exactStartDate: string;
  exactEndDate: string;
  desiredDurationDays: string;
  travelerCount: string;
  adults: string;
  children: string;
  budgetMax: number;
  tripTypes: TripType[];
  style: string;
  accommodation: string;
  transportIncluded: boolean;
  activities: string;
  constraints: string;
  language: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  gdprConsent: boolean;
  termsAccepted: boolean;
}

export const EMPTY_AI_FORM: AiFormData = {
  destination: "",
  dateFlexible: true,
  exactStartDate: "",
  exactEndDate: "",
  desiredDurationDays: "",
  travelerCount: "2",
  adults: "2",
  children: "0",
  budgetMax: 500,
  tripTypes: [],
  style: "",
  accommodation: "",
  transportIncluded: false,
  activities: "",
  constraints: "",
  language: "",
  name: "",
  email: "",
  phone: "",
  country: "",
  gdprConsent: false,
  termsAccepted: false,
};

/** One criterion's contribution, so the UI can explain the ranking. */
export interface MatchReason {
  label: string;
  points: number;
  met: boolean;
}

function norm(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/**
 * CDC §C.2's weighted scoring, but returning *why* alongside the number so the
 * results page can justify each recommendation without a second LLM call.
 * A deterministic explanation can't hallucinate a reason the scorer didn't use.
 */
function scoreTripDetailed(
  trip: GroupTrip,
  form: AiFormData,
  agencyZones: string[],
  t: Translator,
  tType: TypeTranslator
): {
  score: number;
  reasons: MatchReason[];
} {
  const reasons: MatchReason[] = [];
  let score = 0;

  // Destination: matches the trip's own location *or* its country, so "Maroc"
  // matches a departure in Merzouga and "Merzouga" matches it too. A plain
  // substring test on the trip title alone missed every country-level answer,
  // which is exactly what people say out loud.
  const wanted = norm(form.destination);
  const haystack = norm([trip.destination, trip.title, ...agencyZones].join(" "));
  const destinationMet =
    wanted.length > 0 &&
    (haystack.includes(wanted) || wanted.split(/\s+/).some((w) => w.length > 2 && haystack.includes(w)));
  if (destinationMet) score += 3;
  reasons.push({
    label: destinationMet
      ? t("destination", { destination: trip.destination })
      : t("destinationNotMet"),
    points: 3,
    met: destinationMet,
  });

  // Dates
  let datesMet = false;
  let dateLabel: string;
  if (!form.dateFlexible && form.exactStartDate) {
    const wantedAt = new Date(form.exactStartDate).getTime();
    const startAt = new Date(trip.startDate).getTime();
    datesMet = Math.abs(wantedAt - startAt) <= 14 * 24 * 60 * 60 * 1000;
    dateLabel = datesMet ? t("datesNear") : t("datesFar");
    if (datesMet) score += 3;
  } else {
    // Flexible dates match loosely by definition, but only lightly — otherwise
    // every trip ties and the ranking says nothing.
    datesMet = true;
    dateLabel = t("datesFlexible");
    score += 1;
  }
  reasons.push({ label: dateLabel, points: form.dateFlexible ? 1 : 3, met: datesMet });

  // Budget
  const budgetMet = trip.totalPrice <= form.budgetMax;
  if (budgetMet) score += 2;
  reasons.push({
    label: budgetMet ? t("budgetMet") : t("budgetNotMet"),
    points: 2,
    met: budgetMet,
  });

  // Trip type — checks every selected type, not just the first. Selecting
  // "désert + trekking" previously scored only on "désert".
  const typeMet = form.tripTypes.includes(trip.tripType);
  if (typeMet) score += 2;
  reasons.push({
    label: typeMet ? t("typeMet", { type: tType(trip.tripType) }) : t("typeNotMet"),
    points: 2,
    met: typeMet,
  });

  // Shared interest tags, +1 each
  const requestTags = norm([form.activities, form.constraints, form.style].join(" "))
    .split(/[^a-z0-9]+/)
    .filter((tag) => tag.length > 2);
  const shared = trip.aiTags.filter((tag) => requestTags.includes(norm(tag)));
  if (shared.length > 0) {
    score += shared.length;
    reasons.push({
      label: t("matchesInterests", { tags: shared.join(", ") }),
      points: shared.length,
      met: true,
    });
  }

  // Availability isn't scored by §C.2, but a nearly-full departure is the most
  // decision-relevant thing on the card, so it's surfaced as context.
  const remaining = trip.totalSpots - trip.bookedSpots;
  if (remaining > 0 && remaining <= 3) {
    reasons.push({ label: t("fewSeats", { n: remaining }), points: 0, met: true });
  }

  return { score, reasons };
}

/**
 * Fields the conversational assistant is allowed to fill from free text.
 *
 * `gdprConsent` and `termsAccepted` are deliberately excluded — CDC §7 marks
 * both "Bloquant", and consent captured by an LLM's interpretation of speech
 * is not the same legal act as a person clicking a checkbox. The assistant
 * can fill everything else and walk the user to step 5, but the two consent
 * boxes always require an explicit click.
 */
export const ASSISTANT_FILLABLE_KEYS = [
  "destination", "dateFlexible", "exactStartDate", "exactEndDate",
  "desiredDurationDays", "travelerCount", "adults", "children", "budgetMax",
  "tripTypes", "style", "accommodation", "transportIncluded", "activities",
  "constraints", "language", "name", "email", "phone", "country",
] as const satisfies readonly (keyof AiFormData)[];

export type AssistantFillableKey = (typeof ASSISTANT_FILLABLE_KEYS)[number];

/**
 * The subset of ASSISTANT_FILLABLE_KEYS that gate progress, mirroring the
 * "Obligatoire" column of CDC §7's form table. Single source of truth for
 * both the wizard's per-step validation and the conversational assistant's
 * "what should I ask next" logic — the two must never disagree about what's
 * missing.
 */
export function missingRequiredFields(form: AiFormData): string[] {
  const missing: string[] = [];
  if (!form.destination.trim()) missing.push("destination");
  if (form.dateFlexible) {
    if (!form.desiredDurationDays) missing.push("desiredDurationDays");
  } else {
    if (!form.exactStartDate) missing.push("exactStartDate");
    if (!form.exactEndDate) missing.push("exactEndDate");
  }
  if (!form.travelerCount) missing.push("travelerCount");
  if (!form.adults) missing.push("adults");
  if (form.tripTypes.length === 0) missing.push("tripTypes");
  if (!form.name.trim()) missing.push("name");
  if (!form.email.trim()) missing.push("email");
  return missing;
}

/** A ranked trip with the reasoning that put it there. */
export interface ScoredMatch {
  tripId: string;
  score: number;
  /** score as a share of what this request could have scored, 0–100. */
  matchPercent: number;
  reasons: MatchReason[];
  /**
   * Criteria the traveller asked for that this trip does NOT satisfy.
   *
   * Shown alongside the reasons because a recommendation that quietly omits
   * "costs 110 € more than you said" is a recommendation the traveller can't
   * trust. Only ever populated for things they explicitly stated.
   */
  warnings: string[];
}

export interface MatchResult {
  trips: GroupTrip[];
  /** True when no criterion scored above baseline — same cards, no ranking shown. */
  fallback: boolean;
  /** Parallel to `trips`, in the same order. Empty on the fallback path. */
  scored: ScoredMatch[];
}

/**
 * The best score this particular request could achieve, used as the
 * denominator for the percentage.
 *
 * Computed per-request rather than as a constant because the ceiling moves:
 * flexible dates are worth 1 point where exact dates are worth 3, and tag
 * points only exist if the traveller mentioned interests at all. Dividing by
 * a fixed maximum would show "60%" for a trip that matched everything the
 * traveller actually asked for.
 */
function maxAchievableScore(form: AiFormData): number {
  const datePoints = form.dateFlexible ? 1 : 3;
  const tagPoints = norm([form.activities, form.constraints, form.style].join(" "))
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2).length;
  // destination 3 + dates + budget 2 + type 2 + whatever tags could match
  return 3 + datePoints + 2 + 2 + Math.min(tagPoints, 3);
}

/**
 * Result-card ribbons, ranked best-first — "Recommandé" / "Parfait pour
 * vous" / "Bonne option" as drawn on the reference sheet. Only meaningful
 * when the match was actually scored; the fallback path (soonest departure,
 * no scoring) never gets ribbons since nothing was ranked.
 */
export function highlightForRank(rank: number): "top" | "good" | "fallback" {
  return rank === 0 ? "top" : rank === 1 ? "good" : "fallback";
}

function fallbackResult(publishedTrips: GroupTrip[]): MatchResult {
  return {
    trips: [...publishedTrips]
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 3),
    fallback: true,
    // No scoring ran, so claiming a match percentage would be a lie.
    scored: [],
  };
}

/**
 * Structured to never throw: any missing/invalid form data just falls back
 * to the hard-filter-only path sorted by soonest departure, per §7's
 * mandatory fallback rule ("the user must never see a blank result screen").
 */
/** States the gaps between what was asked for and what a trip offers. */
function buildWarnings(
  trip: GroupTrip,
  form: AiFormData,
  t: Translator,
  tType: TypeTranslator,
  locale: string
): string[] {
  const warnings: string[] = [];

  if (trip.totalPrice > form.budgetMax) {
    warnings.push(
      t("warningOverBudget", { amount: formatPrice(trip.totalPrice - form.budgetMax, locale) })
    );
  }

  if (form.tripTypes.length > 0 && !form.tripTypes.includes(trip.tripType)) {
    warnings.push(t("warningWrongType", { type: tType(trip.tripType) }));
  }

  // Only meaningful when they actually named a duration.
  const wantedDays = Number(form.desiredDurationDays);
  if (form.dateFlexible && Number.isFinite(wantedDays) && wantedDays > 0) {
    const diff = Math.abs(trip.durationDays - wantedDays);
    if (diff >= 2) {
      warnings.push(t("warningDuration", { days: trip.durationDays, wanted: wantedDays }));
    }
  }

  return warnings;
}

export function matchTrips(
  trips: GroupTrip[],
  agencies: Agency[],
  form: AiFormData,
  t: Translator,
  tType: TypeTranslator,
  locale: string
): MatchResult {
  const candidates = trips.filter((trip) => trip.status === "PUBLISHED");
  try {
    const zonesByAgency = new Map<string, string[]>();
    for (const agency of agencies) {
      zonesByAgency.set(agency.id, agency.zones ?? []);
    }
    const max = maxAchievableScore(form);

    const ranked = candidates
      .map((trip) => ({
        trip,
        ...scoreTripDetailed(trip, form, zonesByAgency.get(trip.agencyId) ?? [], t, tType),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Ties are common — a country-level request matches every trip there
        // equally, and three results all showing the same percentage tells the
        // traveller nothing. Break deterministically on what they'd weigh next:
        // affordable first, then the departure they can actually still catch.
        const aBudget = a.trip.totalPrice <= form.budgetMax ? 0 : 1;
        const bBudget = b.trip.totalPrice <= form.budgetMax ? 0 : 1;
        if (aBudget !== bBudget) return aBudget - bBudget;

        const aSeats = a.trip.totalSpots - a.trip.bookedSpots;
        const bSeats = b.trip.totalSpots - b.trip.bookedSpots;
        if (aSeats > 0 !== bSeats > 0) return aSeats > 0 ? -1 : 1;

        return new Date(a.trip.startDate).getTime() - new Date(b.trip.startDate).getTime();
      })
      .slice(0, 3);

    const bestScore = ranked[0]?.score ?? 0;
    if (ranked.length > 0 && bestScore > 1) {
      return {
        trips: ranked.map((r) => r.trip),
        fallback: false,
        scored: ranked.map((r) => ({
          tripId: r.trip.id,
          score: r.score,
          matchPercent: Math.max(0, Math.min(100, Math.round((r.score / max) * 100))),
          // Only the criteria that actually landed — a list of things the trip
          // failed reads as an apology, not a recommendation.
          reasons: r.reasons.filter((reason) => reason.met),
          warnings: buildWarnings(r.trip, form, t, tType, locale),
        })),
      };
    }
    return fallbackResult(candidates);
  } catch {
    return fallbackResult(candidates);
  }
}
