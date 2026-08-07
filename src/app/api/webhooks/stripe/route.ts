import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { confirmBookingFromWebhook } from "@/services/bookings.service";

/**
 * Stripe webhook (CDC §H "Webhook handler — logique complète").
 *
 * This route is the single source of truth for payment state. The browser's
 * return to /booking/success proves nothing — a client can land there by
 * closing the tab or pressing back without ever paying.
 *
 * Order is exactly §H's:
 *   1. verify the signature before touching the database;
 *   2. handle only checkout.session.completed;
 *   3. idempotency on stripeSessionId → 200 and stop;
 *   4. one atomic transaction (capacity + Payment + Booking + code);
 *   5. emails fired without blocking the response;
 *   6. return 200.
 */

// The signature is computed over the exact bytes Stripe sent, so the body must
// not be parsed or re-serialised before verification. Node runtime gives us
// request.text() unmodified.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe:webhook] STRIPE_WEBHOOK_SECRET missing");
    return NextResponse.json({ error: "not-configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing-signature" }, { status: 400 });
  }

  const raw = await request.text();

  // (1) Signature verification, before any DB write. An unverified body is an
  // attacker-controlled body — this is what stops anyone from POSTing
  // themselves a free confirmed booking.
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("[stripe:webhook] signature verification failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ error: "invalid-signature" }, { status: 400 });
  }

  // (2) Everything else is acknowledged and ignored. Returning 200 stops
  // Stripe retrying events we deliberately don't handle.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata ?? {};

  const bookingId = meta.bookingId;
  const groupTripId = meta.groupTripId;
  const agencyId = meta.agencyId;
  const numberOfSeats = Number(meta.numberOfSeats ?? "1");

  if (!bookingId || !groupTripId || !agencyId || !Number.isInteger(numberOfSeats)) {
    // Nothing actionable, and retrying won't add the metadata back. 200 so
    // Stripe stops, but loud in the logs because it means a session was created
    // somewhere that didn't go through payments.service.
    console.error("[stripe:webhook] incomplete metadata", { id: session.id, meta });
    return NextResponse.json({ received: true, error: "incomplete-metadata" });
  }

  try {
    // (3) + (4) — idempotency check and the atomic transaction both live in
    // the service, so they can't be reordered or skipped by a caller.
    const outcome = await confirmBookingFromWebhook({
      bookingId,
      groupTripId,
      agencyId,
      numberOfSeats,
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      stripeCustomerEmail: session.customer_email ?? meta.clientEmail ?? "",
      amountPaid: (session.amount_total ?? 0) / 100,
      rawEvent: event,
    });

    if (!outcome.ok && outcome.reason === "already-processed") {
      // Routine: Stripe redelivers. Not an error.
      return NextResponse.json({ received: true, idempotent: true });
    }

    if (!outcome.ok && outcome.reason === "capacity-exhausted") {
      // Money taken, no seat left. The service has already parked the booking
      // for manual refund; surface it loudly so it isn't discovered by an
      // angry client a week later.
      console.error("[stripe:webhook] OVERSOLD — refund required", {
        bookingId: outcome.bookingId,
        sessionId: session.id,
      });
      return NextResponse.json({ received: true, oversold: true });
    }

    // (5) Emails are deliberately not awaited: §H says not to block the
    // response on delivery, and a Resend outage must never cost a confirmed
    // booking or trigger a Stripe retry of an already-applied transaction.
    if (outcome.ok) {
      void sendConfirmationEmails(outcome.booking.id).catch((err) => {
        console.error("[stripe:webhook] confirmation emails failed", {
          bookingId: outcome.booking.id,
          reason: err instanceof Error ? err.message : "unknown",
        });
      });
    }

    // (6)
    return NextResponse.json({ received: true });
  } catch (err) {
    // A 500 here makes Stripe retry, which is what we want for a transient
    // database failure — the idempotency check makes the retry safe.
    console.error("[stripe:webhook] processing failed", {
      sessionId: session.id,
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ error: "processing-failed" }, { status: 500 });
  }
}

/** E2 to the client, E3 to the agency (§I). Loaded lazily to keep the hot path thin. */
async function sendConfirmationEmails(bookingId: string) {
  const { sendBookingConfirmed } = await import("@/services/email.service");
  await sendBookingConfirmed(bookingId);
}
