import "server-only";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { conflict, notFound } from "@/services/errors";

/**
 * Stripe Checkout session creation (CDC §H).
 *
 * Fixed decisions from §H, not to be revisited mid-build:
 *  - hosted Checkout, no custom card form;
 *  - one platform account, no Connect, no split payouts;
 *  - the deposit only — the balance is settled with the agency on site;
 *  - the webhook is the sole source of truth for payment state.
 *
 * One deliberate departure from §H's literal code sample: `payment_method_types`
 * is omitted rather than hardcoded to `['card']`. Stripe's current guidance is
 * explicit that hardcoding it — even for a card-only mental model — should
 * never be done; omitting it turns on dynamic payment methods, where Stripe
 * shows each customer the locally relevant options (iDEAL, Bancontact, etc.)
 * based on currency, location and amount, chosen from the Dashboard with no
 * code change. This doesn't conflict with §H's actual intent — "hosted
 * Checkout, not a custom card form" — dynamic methods are still hosted
 * Checkout; only the fixed method list is dropped.
 */

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

const ALPHA = "abcdefghijklmnopqrstuvwxyz";

/**
 * Tags every session so the Dashboard can be filtered to this flow specifically
 * — useful once more than one checkout path exists. Supported from API version
 * 2026-03-25.dahlia onward; this app is pinned to 2026-07-29.dahlia.
 */
function integrationIdentifier(): string {
  let suffix = "";
  for (let i = 0; i < 8; i++) suffix += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return `mv-deposit-checkout-${suffix}`;
}

export async function createCheckoutSession(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { groupTrip: true },
  });

  if (!booking) throw notFound("Réservation introuvable.");
  if (booking.status !== "PENDING_PAYMENT") {
    throw conflict("Cette réservation a déjà été traitée.");
  }

  const trip = booking.groupTrip;
  const deposit = Number(trip.depositAmount);

  const dates = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatRange(trip.startDate, trip.endDate);

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: trip.currency.toLowerCase(),
          // Stripe works in minor units. Math.round guards against the float
          // artefacts that turn 150.00 into 14999.999999999998 cents.
          unit_amount: Math.round(deposit * 100),
          product_data: {
            name: `Acompte — ${trip.title}`,
            description: `${trip.destination} · ${dates}`,
          },
        },
        quantity: booking.numberOfSeats,
      },
    ],
    mode: "payment",
    customer_email: booking.clientEmail,
    success_url: `${appUrl()}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/trip/${trip.slug}`,
    // The webhook reads these back. They are the only link from Stripe's world
    // to ours, so everything the confirmation needs must be here.
    metadata: {
      bookingId: booking.id,
      groupTripId: trip.id,
      agencyId: booking.agencyId,
      clientEmail: booking.clientEmail,
      numberOfSeats: String(booking.numberOfSeats),
    },
    // A checkout left open forever would hold a booking in limbo; 30 minutes
    // is Stripe's minimum and matches how long someone realistically takes.
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    integration_identifier: integrationIdentifier(),
    // Managed Payments (Stripe's merchant-of-record mode) is on by default for
    // new accounts and requires a tax_code on every product, which the CDC's
    // scope never asked for — no tax registration or collection is specified
    // anywhere in the spec. Turned off explicitly rather than adding tax codes
    // to satisfy a product neither the client nor the CDC requested.
    managed_payments: { enabled: false },
  });

  return session;
}
