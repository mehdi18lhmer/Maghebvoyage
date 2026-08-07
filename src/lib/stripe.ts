import "server-only";

import Stripe from "stripe";

/**
 * Stripe singleton (CDC §5.2 "stripe.ts → instance singleton").
 *
 * Constructed lazily so the app boots without Stripe configured — the payment
 * routes fail loudly when actually called, rather than taking the whole server
 * down at import time while the rest of the product is still usable.
 */

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local (Stripe dashboard → Developers → API keys)."
    );
  }

  client = new Stripe(key, {
    // Pinned deliberately to the version this SDK was generated against
    // (stripe@22's apiVersion.js). Stripe ships breaking API changes, and an
    // integration that silently follows the account's default version can
    // start failing without a deploy.
    apiVersion: "2026-07-29.dahlia",
    typescript: true,
    appInfo: { name: "MaghrebVoyage", version: "1.0.0" },
  });

  return client;
}

/** True when payments are configured — lets the UI degrade instead of erroring. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
