import { NextResponse } from "next/server";
import { z } from "zod";
import { initiateBooking } from "@/services/bookings.service";
import { createCheckoutSession } from "@/services/payments.service";
import { ServiceError } from "@/services/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * CDC §F step 1–4 + §10's specific rate limit: "5 tentatives / IP / heure —
 * c'est l'endpoint qui crée les sessions Stripe ; c'est la surface d'abus."
 *
 * Publicly reachable by design (§2/§G.1: booking needs no account), which is
 * exactly why this is the one booking-flow endpoint with a tight limit — the
 * AI endpoints get a generous one because a wrong answer costs nothing; a
 * script hitting this one costs a Stripe session every time.
 */
export const runtime = "nodejs";

const MAX_PER_HOUR = 5;
const WINDOW_SECONDS = 60 * 60;

const BodySchema = z.object({
  groupTripId: z.string().min(1),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  clientCountry: z.string().optional(),
  numberOfSeats: z.number().int().min(1).max(20),
  notes: z.string().max(1000).optional(),
  travelRequestId: z.string().optional(),
  gdprConsent: z.literal(true),
  termsAccepted: z.literal(true),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = await rateLimit(`bookings:initiate:${ip}`, MAX_PER_HOUR, WINDOW_SECONDS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives de réservation. Réessayez dans une heure." },
      { status: 429, headers: { "Retry-After": String(WINDOW_SECONDS) } }
    );
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Formulaire invalide.", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    // §F: create the PENDING_PAYMENT booking first, then the Stripe session —
    // never the reverse, or a session could exist with no booking to confirm.
    const booking = await initiateBooking(parsed.data);
    const session = await createCheckoutSession(booking.id);

    if (!session.url) {
      // Stripe accepted the request but returned no hosted URL — nothing to
      // redirect the client to. Treat it as a Stripe-side failure, not ours.
      return NextResponse.json({ error: "Impossible de créer la session de paiement." }, { status: 502 });
    }

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
    }
    console.error("[bookings:initiate] unexpected failure", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez." }, { status: 500 });
  }
}
