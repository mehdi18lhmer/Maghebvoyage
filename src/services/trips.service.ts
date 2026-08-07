import "server-only";

import { Prisma, TripStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";
import { conflict, forbidden, invalid, notFound } from "@/services/errors";

/**
 * GroupTrip business rules (CDC §D "Règles métier").
 *
 * Every rule the spec states is enforced here rather than in a route handler,
 * so the agency dashboard, the admin dashboard and any future API all get the
 * same behaviour. Routes validate shape; this file decides what's allowed.
 */

/**
 * CLAUDE.md §5, added rule not in the source spec.
 *
 * The CDC only requires depositAmount < totalPrice. With no floor, an agency
 * can set a €5 deposit on a €2000 trip, which turns every no-show into the
 * platform's support problem rather than the agency's. 10% is the floor.
 */
export const MIN_DEPOSIT_RATIO = 0.1;

/** §D: "startDate doit être > aujourd'hui + 7 jours" — minimum lead time to fill seats. */
export const MIN_LEAD_DAYS = 7;

/** §D: in PUBLISHED, only these may change. Never price, dates or capacity. */
const PUBLISHED_EDITABLE = ["description", "images", "coverImage", "meetingPoint"] as const;
export type PublishedEditableField = (typeof PUBLISHED_EDITABLE)[number];

export interface TripDraftInput {
  title: string;
  destination: string;
  description: string;
  tripType: Parameters<typeof prisma.groupTrip.create>[0]["data"]["tripType"];
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  depositAmount: number;
  currency?: string;
  totalSpots: number;
  coverImage?: string | null;
  images?: string[];
  inclusions?: string[];
  exclusions?: string[];
  meetingPoint?: string | null;
  programDays?: string | null;
  guideLanguages?: string[];
  physicalLevel?: Parameters<typeof prisma.groupTrip.create>[0]["data"]["physicalLevel"];
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Validates a draft against §D's field rules. Collected rather than
 * fail-fast so the agency wizard can show every problem at once instead of
 * making them submit four times.
 */
export function validateTripDraft(input: TripDraftInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (input.title.trim().length < 10 || input.title.trim().length > 100) {
    errors.title = "Le titre doit contenir entre 10 et 100 caractères.";
  }
  if (input.description.trim().length < 200) {
    errors.description = "La description doit contenir au moins 200 caractères.";
  }
  if (!input.destination.trim()) {
    errors.destination = "La destination est obligatoire.";
  }

  const leadDays = daysBetween(new Date(), input.startDate);
  if (leadDays <= MIN_LEAD_DAYS) {
    errors.startDate = `Le départ doit être dans plus de ${MIN_LEAD_DAYS} jours.`;
  }
  if (input.endDate <= input.startDate) {
    errors.endDate = "La date de retour doit être après la date de départ.";
  }

  if (!(input.totalPrice > 0)) {
    errors.totalPrice = "Le prix total doit être supérieur à 0.";
  }
  if (!(input.depositAmount > 0)) {
    errors.depositAmount = "L’acompte doit être supérieur à 0.";
  } else if (input.depositAmount >= input.totalPrice) {
    errors.depositAmount = "L’acompte doit être inférieur au prix total.";
  } else if (input.depositAmount < input.totalPrice * MIN_DEPOSIT_RATIO) {
    const min = (input.totalPrice * MIN_DEPOSIT_RATIO).toFixed(2);
    errors.depositAmount = `L’acompte doit représenter au moins 10% du prix total (${min} €).`;
  }

  if (!Number.isInteger(input.totalSpots) || input.totalSpots <= 0) {
    errors.totalSpots = "Le nombre de places doit être un entier positif.";
  }
  if ((input.images?.length ?? 0) > 8) {
    errors.images = "8 photos maximum.";
  }

  return errors;
}

/**
 * §E — slug generated from the title, with -2, -3… on collision.
 *
 * Loops rather than appending a random suffix because the slug IS the Lien
 * Magique: agencies paste it into WhatsApp, so it should stay readable.
 */
async function uniqueSlug(title: string): Promise<string> {
  const base = toSlug(title) || "voyage";
  let candidate = base;
  let n = 2;
  // Bounded: a title colliding 50 times means something is wrong upstream.
  while (n < 50) {
    const taken = await prisma.groupTrip.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
  return `${base}-${Date.now()}`;
}

/**
 * CDC §4 — "Une agence ne peut accéder qu'à SES données". The shared guard
 * CLAUDE.md asks for, so no route has to remember to re-check inline. A route
 * that forgets this is how one agency's bookings leak to another.
 */
export async function assertAgencyOwnsTrip(tripId: string, agencyId: string) {
  const trip = await prisma.groupTrip.findUnique({ where: { id: tripId } });
  if (!trip) throw notFound("Voyage introuvable.");
  if (trip.agencyId !== agencyId) {
    // 404, not 403: a different agency shouldn't even learn the trip exists.
    throw notFound("Voyage introuvable.");
  }
  return trip;
}

export async function createDraft(agencyId: string, input: TripDraftInput) {
  const errors = validateTripDraft(input);
  if (Object.keys(errors).length > 0) {
    throw invalid("Le formulaire contient des erreurs.", errors);
  }

  const slug = await uniqueSlug(input.title);

  return prisma.groupTrip.create({
    data: {
      agencyId,
      title: input.title.trim(),
      slug,
      destination: input.destination.trim(),
      description: input.description.trim(),
      tripType: input.tripType,
      startDate: input.startDate,
      endDate: input.endDate,
      durationDays: Math.max(1, daysBetween(input.startDate, input.endDate)),
      totalPrice: new Prisma.Decimal(input.totalPrice),
      depositAmount: new Prisma.Decimal(input.depositAmount),
      currency: input.currency ?? "EUR",
      totalSpots: input.totalSpots,
      coverImage: input.coverImage ?? null,
      images: input.images ?? [],
      inclusions: input.inclusions ?? [],
      exclusions: input.exclusions ?? [],
      meetingPoint: input.meetingPoint ?? null,
      programDays: input.programDays ?? null,
      guideLanguages: input.guideLanguages ?? [],
      physicalLevel: input.physicalLevel ?? null,
      status: TripStatus.DRAFT,
    },
  });
}

/**
 * §D — publication.
 *
 * Two gates: the agency must be VERIFIED, and a cover image is mandatory.
 * DRAFT → PUBLISHED happens directly; there is deliberately no admin approval
 * for individual trips (§K.3 "L'admin ne valide PAS les voyages").
 */
export async function publishTrip(tripId: string, agencyId: string) {
  const trip = await assertAgencyOwnsTrip(tripId, agencyId);

  if (trip.status !== TripStatus.DRAFT) {
    throw conflict("Seul un voyage en brouillon peut être publié.");
  }

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { verificationStatus: true },
  });
  if (agency?.verificationStatus !== "VERIFIED") {
    throw forbidden("Votre agence doit être vérifiée avant de publier un voyage.");
  }

  if (!trip.coverImage) {
    throw invalid("Une photo de couverture est obligatoire pour publier.", {
      coverImage: "Ajoutez une photo de couverture.",
    });
  }

  // Re-checked at publish time, not just at creation: a draft written three
  // weeks ago may no longer satisfy the 7-day lead time.
  if (daysBetween(new Date(), trip.startDate) <= MIN_LEAD_DAYS) {
    throw invalid(`Le départ doit être dans plus de ${MIN_LEAD_DAYS} jours.`, {
      startDate: "Date de départ trop proche.",
    });
  }

  return prisma.groupTrip.update({
    where: { id: tripId },
    data: { status: TripStatus.PUBLISHED, aiTags: buildAiTags(trip) },
  });
}

/** §D "aiTags — générés automatiquement à la publication", feeding §C.2 scoring. */
function buildAiTags(trip: {
  destination: string;
  tripType: string;
  title: string;
  inclusions: string[];
}): string[] {
  const raw = [
    trip.tripType.toLowerCase(),
    ...trip.destination.split(/[,\s]+/),
    ...trip.inclusions.flatMap((i) => i.split(/[,\s]+/)),
  ];
  return [
    ...new Set(
      raw
        .map((t) =>
          t
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[\u0300-\u036f]/g, "")
        )
        .filter((t) => t.length > 2)
    ),
  ].slice(0, 12);
}

/**
 * §D — "En PUBLISHED, seuls les champs non-critiques sont modifiables
 * (description, photos, meetingPoint) — pas le prix ni les dates."
 *
 * Enforced by construction: the update payload is rebuilt from a whitelist,
 * so an extra field in the request body is dropped rather than trusted.
 */
export async function updateTrip(
  tripId: string,
  agencyId: string,
  patch: Partial<TripDraftInput>
) {
  const trip = await assertAgencyOwnsTrip(tripId, agencyId);

  if (trip.status === TripStatus.CANCELLED) {
    throw conflict("Un voyage annulé ne peut plus être modifié.");
  }

  if (trip.status === TripStatus.DRAFT) {
    const merged = { ...toDraftInput(trip), ...patch };
    const errors = validateTripDraft(merged);
    if (Object.keys(errors).length > 0) {
      throw invalid("Le formulaire contient des erreurs.", errors);
    }
    return prisma.groupTrip.update({
      where: { id: tripId },
      data: {
        ...patch,
        ...(patch.totalPrice !== undefined && {
          totalPrice: new Prisma.Decimal(patch.totalPrice),
        }),
        ...(patch.depositAmount !== undefined && {
          depositAmount: new Prisma.Decimal(patch.depositAmount),
        }),
        ...(patch.startDate && patch.endDate
          ? { durationDays: Math.max(1, daysBetween(patch.startDate, patch.endDate)) }
          : {}),
      },
    });
  }

  // PUBLISHED / FULL / CLOSED — whitelist only.
  const safe: Record<string, unknown> = {};
  for (const field of PUBLISHED_EDITABLE) {
    if (patch[field as keyof TripDraftInput] !== undefined) {
      safe[field] = patch[field as keyof TripDraftInput];
    }
  }
  if (Object.keys(safe).length === 0) {
    throw conflict(
      "Une fois publié, seuls la description, les photos et le point de rendez-vous sont modifiables."
    );
  }

  return prisma.groupTrip.update({ where: { id: tripId }, data: safe });
}

function toDraftInput(trip: {
  title: string;
  destination: string;
  description: string;
  tripType: TripDraftInput["tripType"];
  startDate: Date;
  endDate: Date;
  totalPrice: Prisma.Decimal;
  depositAmount: Prisma.Decimal;
  totalSpots: number;
  images: string[];
}): TripDraftInput {
  return {
    title: trip.title,
    destination: trip.destination,
    description: trip.description,
    tripType: trip.tripType,
    startDate: trip.startDate,
    endDate: trip.endDate,
    totalPrice: Number(trip.totalPrice),
    depositAmount: Number(trip.depositAmount),
    totalSpots: trip.totalSpots,
    images: trip.images,
  };
}

/**
 * §G.2 — agency cancels a whole trip.
 *
 * Trip → CANCELLED and every CONFIRMED booking cascades to CANCELLED, in one
 * transaction: a half-applied cancellation would leave clients holding
 * confirmed bookings for a trip that no longer runs.
 *
 * Returns the affected bookings so the caller can send E11 to each client and
 * E12 to the admin with the refund batch.
 */
export async function cancelTrip(tripId: string, agencyId: string, reason: string) {
  if (!reason.trim()) {
    throw invalid("Le motif d’annulation est obligatoire.", {
      reason: "Indiquez un motif.",
    });
  }

  const trip = await assertAgencyOwnsTrip(tripId, agencyId);
  if (trip.status === TripStatus.CANCELLED) {
    throw conflict("Ce voyage est déjà annulé.");
  }

  return prisma.$transaction(async (tx) => {
    const affected = await tx.booking.findMany({
      where: { groupTripId: tripId, status: "CONFIRMED" },
    });

    await tx.groupTrip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason.trim(),
      },
    });

    await tx.booking.updateMany({
      where: { groupTripId: tripId, status: "CONFIRMED" },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: `Voyage annulé par l’agence : ${reason.trim()}`,
      },
    });

    return { trip, affected };
  });
}

/** §J.5 — agency closes a trip to new bookings without cancelling it. */
export async function closeTrip(tripId: string, agencyId: string) {
  const trip = await assertAgencyOwnsTrip(tripId, agencyId);
  if (trip.status !== TripStatus.PUBLISHED && trip.status !== TripStatus.FULL) {
    throw conflict("Seul un voyage publié peut être fermé.");
  }
  return prisma.groupTrip.update({
    where: { id: tripId },
    data: { status: TripStatus.CLOSED },
  });
}

/**
 * §K.3 — admin suspends a trip across ANY agency (no ownership check: this is
 * the one action the CDC gives admin over an individual trip, since "L'admin
 * ne valide PAS les voyages — il intervient seulement a posteriori").
 * Existing CONFIRMED bookings are untouched — suspension blocks new bookings,
 * it isn't a cancellation.
 */
export async function suspendTripByAdmin(tripId: string) {
  const trip = await prisma.groupTrip.findUnique({ where: { id: tripId } });
  if (!trip) throw notFound("Voyage introuvable.");
  if (trip.status !== TripStatus.PUBLISHED && trip.status !== TripStatus.FULL) {
    throw conflict("Seul un voyage publié peut être suspendu.");
  }
  return prisma.groupTrip.update({ where: { id: tripId }, data: { status: TripStatus.CLOSED } });
}

/** §K.3 — admin reactivates a trip it (or the agency) previously closed. */
export async function reactivateTripByAdmin(tripId: string) {
  const trip = await prisma.groupTrip.findUnique({ where: { id: tripId } });
  if (!trip) throw notFound("Voyage introuvable.");
  if (trip.status !== TripStatus.CLOSED) {
    throw conflict("Seul un voyage fermé peut être réactivé.");
  }
  return prisma.groupTrip.update({
    where: { id: tripId },
    data: { status: trip.bookedSpots >= trip.totalSpots ? TripStatus.FULL : TripStatus.PUBLISHED },
  });
}
