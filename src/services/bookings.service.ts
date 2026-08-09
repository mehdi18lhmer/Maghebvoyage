import "server-only";

import crypto from "node:crypto";
import { BookingStatus, Prisma, TripStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { conflict, invalid, notFound } from "@/services/errors";

/**
 * Booking lifecycle (CDC §F, §G, §H).
 *
 * The capacity rules here are the highest-risk code in the product. Two of
 * them are worth reading before changing anything:
 *
 *  1. `bookedSpots` has exactly two legal writers — `confirmBookingFromWebhook`
 *     (increment) and `cancelBookingByUser` / `cancelBookingByAdmin`
 *     (decrement). CDC §D states this as an invariant, not a preference.
 *
 *  2. Both writers use a single conditional `updateMany`, never a read
 *     followed by a write. A SELECT-then-UPDATE has a window where two
 *     concurrent webhooks both observe the last seat as free and both take it.
 */

/** §F — 'MV-' + 6 random digits, generated at confirmation, never at creation. */
export function generateConfirmationCode(): string {
  // randomInt is uniform; Math.random() would bias the distribution and is not
  // a good habit to establish on anything identifier-shaped.
  return `MV-${crypto.randomInt(0, 1_000_000).toString().padStart(6, "0")}`;
}

export interface InitiateBookingInput {
  groupTripId: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientCountry?: string;
  numberOfSeats: number;
  notes?: string;
  travelRequestId?: string;
  gdprConsent: boolean;
  termsAccepted: boolean;
}

/**
 * §F step 1–3 — creates a PENDING_PAYMENT booking before redirecting to Stripe.
 *
 * Note what this deliberately does NOT do: it does not increment
 * `bookedSpots`. A booking that never gets paid must not hold a seat, so
 * capacity is only taken when the webhook confirms real money. The check here
 * is advisory — it stops an obviously-full trip early to save the user a
 * pointless trip to Stripe, but the authoritative check is in the webhook.
 */
export async function initiateBooking(input: InitiateBookingInput) {
  if (!input.gdprConsent || !input.termsAccepted) {
    // §F marks both "Bloquant".
    throw invalid("Vous devez accepter les CGU et le traitement de vos données.", {
      consent: "Consentement obligatoire.",
    });
  }
  if (!Number.isInteger(input.numberOfSeats) || input.numberOfSeats < 1) {
    throw invalid("Nombre de places invalide.", { numberOfSeats: "Au moins une place." });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.clientEmail)) {
    throw invalid("Email invalide.", { clientEmail: "Format d’email invalide." });
  }
  if (input.clientName.trim().length < 2) {
    throw invalid("Nom invalide.", { clientName: "Nom trop court." });
  }

  const trip = await prisma.groupTrip.findUnique({ where: { id: input.groupTripId } });
  if (!trip) throw notFound("Voyage introuvable.");

  if (trip.status !== TripStatus.PUBLISHED) {
    throw conflict("Ce voyage n’est pas ouvert à la réservation.");
  }
  if (trip.bookedSpots + input.numberOfSeats > trip.totalSpots) {
    throw conflict("Il ne reste plus assez de places pour ce voyage.");
  }
  if (trip.startDate <= new Date()) {
    throw conflict("Ce voyage est déjà parti.");
  }

  return prisma.booking.create({
    data: {
      groupTripId: trip.id,
      agencyId: trip.agencyId,
      userId: input.userId,
      travelRequestId: input.travelRequestId ?? null,
      clientName: input.clientName.trim(),
      clientEmail: input.clientEmail.trim().toLowerCase(),
      clientPhone: input.clientPhone?.trim() || null,
      clientCountry: input.clientCountry?.trim() || null,
      numberOfSeats: input.numberOfSeats,
      totalAmount: new Prisma.Decimal(Number(trip.totalPrice) * input.numberOfSeats),
      notes: input.notes?.trim() || null,
      status: BookingStatus.PENDING_PAYMENT,
    },
  });
}

export type ConfirmOutcome =
  | { ok: true; booking: Awaited<ReturnType<typeof prisma.booking.findUniqueOrThrow>>; confirmationCode: string }
  | { ok: false; reason: "already-processed" }
  | { ok: false; reason: "capacity-exhausted"; bookingId: string };

/**
 * §H step 3–4 — the webhook's transactional core. Called only by the Stripe
 * webhook route, which has already verified the signature.
 *
 * Order matters and is dictated by §H:
 *   1. idempotency check on stripeSessionId → return early, do nothing;
 *   2. one transaction containing the conditional capacity increment, the
 *      Payment row, the Booking confirmation and the confirmation code.
 *
 * If capacity is gone, the booking is NOT confirmed and NOT silently dropped —
 * it is flagged so an admin can refund. CLAUDE.md is explicit that both silent
 * outcomes are wrong.
 */
export async function confirmBookingFromWebhook(params: {
  bookingId: string;
  groupTripId: string;
  agencyId: string;
  numberOfSeats: number;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  stripeCustomerEmail: string;
  amountPaid: number;
  rawEvent: unknown;
}): Promise<ConfirmOutcome> {
  // (1) Idempotency. Stripe redelivers webhooks — this is routine, not an edge
  // case. The unique index on stripeSessionId is the backstop if two
  // deliveries somehow race past this check.
  const existing = await prisma.payment.findUnique({
    where: { stripeSessionId: params.stripeSessionId },
    select: { id: true },
  });
  if (existing) return { ok: false, reason: "already-processed" };

  const confirmationCode = generateConfirmationCode();

  return prisma.$transaction(async (tx) => {
    // (2) THE atomic capacity claim.
    //
    // Raw SQL, deliberately. The condition compares two columns of the same
    // row (`bookedSpots + n <= totalSpots`), which Prisma's query API cannot
    // express in a `where` — its filters compare a column to a value. Any
    // JS-side version of this check is a read followed by a write, with a
    // window between them where two concurrent webhooks both see the last seat
    // as free and both take it. Postgres evaluates the WHERE and the SET of a
    // single UPDATE against the same row version, which is what closes it.
    //
    // The row lock this takes is held until the transaction below commits, so
    // the Payment and Booking writes are covered by the same claim.
    const claimedRows = await tx.$executeRaw`
      UPDATE "GroupTrip"
      SET "bookedSpots" = "bookedSpots" + ${params.numberOfSeats},
          "status" = CASE
            WHEN "bookedSpots" + ${params.numberOfSeats} >= "totalSpots" THEN 'FULL'::"TripStatus"
            ELSE "status"
          END,
          "updatedAt" = NOW()
      WHERE "id" = ${params.groupTripId}
        AND "bookedSpots" + ${params.numberOfSeats} <= "totalSpots"
    `;

    if (claimedRows === 0) {
      // Capacity went while the client was on Stripe's page. The money is
      // real, so the booking must not be confirmed and must not vanish: park
      // it for the admin's manual-refund queue (§G.3) with the reason stated.
      await tx.booking.update({
        where: { id: params.bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason:
            "Places épuisées pendant le paiement — remboursement à traiter.",
        },
      });

      await tx.payment.create({
        data: {
          bookingId: params.bookingId,
          groupTripId: params.groupTripId,
          agencyId: params.agencyId,
          stripeSessionId: params.stripeSessionId,
          stripePaymentIntentId: params.stripePaymentIntentId,
          stripeCustomerEmail: params.stripeCustomerEmail,
          amount: new Prisma.Decimal(params.amountPaid),
          // SUCCEEDED is accurate: Stripe did take the money. The refund is a
          // separate, later transition — recording this as FAILED would lose
          // the fact that the customer was actually charged.
          status: "SUCCEEDED",
          paidAt: new Date(),
          rawProviderResponse: params.rawEvent as Prisma.InputJsonValue,
        },
      });

      return { ok: false as const, reason: "capacity-exhausted" as const, bookingId: params.bookingId };
    }

    const payment = await tx.payment.create({
      data: {
        bookingId: params.bookingId,
        groupTripId: params.groupTripId,
        agencyId: params.agencyId,
        stripeSessionId: params.stripeSessionId,
        stripePaymentIntentId: params.stripePaymentIntentId,
        stripeCustomerEmail: params.stripeCustomerEmail,
        amount: new Prisma.Decimal(params.amountPaid),
        status: "SUCCEEDED",
        paidAt: new Date(),
        rawProviderResponse: params.rawEvent as Prisma.InputJsonValue,
      },
    });

    const booking = await tx.booking.update({
      where: { id: params.bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        confirmationCode,
        depositPaid: new Prisma.Decimal(params.amountPaid),
        paymentId: payment.id,
      },
    });

    return { ok: true as const, booking, confirmationCode };
  });
}

/**
 * Every booking belonging to one client account — the account dashboard's
 * list, and the read side of the same ownership rule `cancelBookingByUser`
 * enforces on the write side: scoped by `userId`, never by email. Email is
 * denormalized onto Booking and is not a credential — two accounts could
 * share one, and a client can change theirs.
 *
 * Soonest departure first among upcoming trips, so the thing a client is
 * about to travel on is what they see when the page opens.
 */
export async function listBookingsForUser(userId: string) {
  return prisma.booking.findMany({
    where: { userId },
    include: {
      groupTrip: {
        select: {
          slug: true,
          title: true,
          destination: true,
          startDate: true,
          endDate: true,
          meetingPoint: true,
          status: true,
        },
      },
      agency: { select: { name: true, contactEmail: true, contactPhone: true } },
    },
    orderBy: [{ groupTrip: { startDate: "asc" } }],
  });
}

/**
 * §G.1 — client cancels from their account dashboard (superseding the
 * original token-link design once clients had accounts to log into — see
 * CLAUDE.md's client-accounts pivot). Ownership is enforced by matching the
 * session's userId against `booking.userId` instead of a bearer token.
 *
 * Mirrors the confirmation path exactly: the seat is released with the same
 * single-statement conditional update, guarded on the booking still being
 * CONFIRMED.
 */
export async function cancelBookingByUser(bookingId: string, userId: string, reason?: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { groupTrip: true, agency: true },
  });

  if (!booking || booking.userId !== userId) throw notFound("Réservation introuvable.");

  if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REFUNDED) {
    throw conflict("Cette réservation a déjà été annulée.");
  }
  if (booking.status !== BookingStatus.CONFIRMED) {
    throw conflict("Seule une réservation confirmée peut être annulée.");
  }

  return prisma.$transaction(async (tx) => {
    // Guarded on status inside the transaction, so two clicks on the cancel
    // link can't decrement the seat count twice.
    const cancelled = await tx.booking.updateMany({
      where: { id: booking.id, status: BookingStatus.CONFIRMED },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason?.trim() || "Annulé par le client",
      },
    });

    if (cancelled.count === 0) {
      throw conflict("Cette réservation a déjà été annulée.");
    }

    // Release the seats, and drop FULL back to PUBLISHED (§G.1 step 7). The
    // GREATEST() guard keeps bookedSpots from ever going negative if the count
    // were somehow already inconsistent.
    await tx.$executeRaw`
      UPDATE "GroupTrip"
      SET "bookedSpots" = GREATEST(0, "bookedSpots" - ${booking.numberOfSeats}),
          "status" = CASE
            WHEN "status" = 'FULL'::"TripStatus" THEN 'PUBLISHED'::"TripStatus"
            ELSE "status"
          END,
          "updatedAt" = NOW()
      WHERE "id" = ${booking.groupTripId}
    `;

    return booking;
  });
}

/** §K.4 — admin marks a cancelled booking as refunded once Stripe shows the refund. */
export async function markBookingRefunded(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw notFound("Réservation introuvable.");
  if (booking.status !== BookingStatus.CANCELLED) {
    throw conflict("Seule une réservation annulée peut être marquée remboursée.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.REFUNDED, refundedAt: new Date() },
    });
    await tx.payment.updateMany({
      where: { bookingId },
      data: { status: "REFUNDED" },
    });
    return updated;
  });
}

/**
 * §K.4 — admin cancels a booking directly (distinct from the client's
 * token-based cancellation, but releasing the seat the exact same way).
 * Used e.g. for a no-show or a client who calls the agency instead of using
 * their email link.
 */
export async function cancelBookingByAdmin(bookingId: string, reason: string) {
  if (!reason.trim()) throw invalid("Le motif d'annulation est obligatoire.", { reason: "Motif requis." });

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw notFound("Réservation introuvable.");
  if (booking.status !== BookingStatus.CONFIRMED) {
    throw conflict("Seule une réservation confirmée peut être annulée.");
  }

  return prisma.$transaction(async (tx) => {
    const cancelled = await tx.booking.updateMany({
      where: { id: booking.id, status: BookingStatus.CONFIRMED },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: reason.trim() },
    });
    if (cancelled.count === 0) throw conflict("Cette réservation a déjà été annulée.");

    await tx.$executeRaw`
      UPDATE "GroupTrip"
      SET "bookedSpots" = GREATEST(0, "bookedSpots" - ${booking.numberOfSeats}),
          "status" = CASE WHEN "status" = 'FULL'::"TripStatus" THEN 'PUBLISHED'::"TripStatus" ELSE "status" END,
          "updatedAt" = NOW()
      WHERE "id" = ${booking.groupTripId}
    `;

    return booking;
  });
}

/**
 * CLAUDE.md §6.4, added guardrail not in the source spec: cancellations that
 * nobody ever marked REFUNDED. The spec makes refunds fully manual with no
 * staleness check, which is exactly how one goes unnoticed for a month.
 */
export async function findStaleRefunds(olderThanDays = 3) {
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
  return prisma.booking.findMany({
    where: {
      status: BookingStatus.CANCELLED,
      cancelledAt: { lte: cutoff },
      payment: { status: "SUCCEEDED" },
    },
    include: { groupTrip: true, agency: true },
    orderBy: { cancelledAt: "asc" },
  });
}
