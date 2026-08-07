import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelBookingByToken } from "@/services/bookings.service";
import { ServiceError } from "@/services/errors";

/**
 * §G.1 — client cancellation via the token from their confirmation email.
 * No auth: the token IS the credential (§10 — random UUID, checked against
 * status so a replayed link on an already-cancelled booking just 409s).
 */
export async function POST(request: Request) {
  const BodySchema = z.object({ token: z.string().min(1) });
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Lien d'annulation invalide." }, { status: 400 });
  }

  try {
    const booking = await cancelBookingByToken(parsed.data.token);

    // E8 (client) + E9 (agency) + E10 (admin) — after the cancellation has
    // actually committed, never before.
    void import("@/services/email.service").then(({ sendClientCancellation }) =>
      sendClientCancellation(booking.id).catch((err) => {
        console.error("[bookings:cancel] E8/E9/E10 failed", {
          bookingId: booking.id,
          reason: err instanceof Error ? err.message : "unknown",
        });
      })
    );

    return NextResponse.json({ booking: { id: booking.id, status: "CANCELLED" } });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
