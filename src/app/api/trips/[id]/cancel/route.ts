import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { cancelTrip } from "@/services/trips.service";
import { ServiceError } from "@/services/errors";

const BodySchema = z.object({ reason: z.string().min(1) });

/**
 * §G.2 — agency cancels a whole trip. Every CONFIRMED booking cascades to
 * CANCELLED in the same transaction (see trips.service.ts). E11/E12 are fired
 * here, once the cascade has actually committed — never before, since an
 * email announcing a cancellation that then fails to save would be worse
 * than no email at all.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "AGENCY" || !session.user.agencyId) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await params;
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Le motif d'annulation est obligatoire." }, { status: 422 });
  }

  try {
    const { trip, affected } = await cancelTrip(id, session.user.agencyId, parsed.data.reason);

    void import("@/services/email.service").then(({ sendTripCancelledByAgency }) =>
      sendTripCancelledByAgency(trip.id, affected.map((b) => b.id)).catch((err) => {
        console.error("[trips:cancel] E11/E12 failed", { tripId: trip.id, reason: err instanceof Error ? err.message : "unknown" });
      })
    );

    return NextResponse.json({ trip, affectedBookings: affected.length });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
    }
    throw err;
  }
}
