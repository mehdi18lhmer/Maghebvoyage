import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { cancelBookingByUser } from "@/services/bookings.service";
import { ServiceError } from "@/services/errors";

/**
 * §G.1 — client cancellation from their account dashboard. Cancellation is
 * account-based now (see CLAUDE.md's client-accounts pivot): the session's
 * userId is the credential, checked against `booking.userId` in the service.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  const BodySchema = z.object({ bookingId: z.string().min(1), reason: z.string().optional() });
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    const booking = await cancelBookingByUser(parsed.data.bookingId, session.user.id, parsed.data.reason);

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
