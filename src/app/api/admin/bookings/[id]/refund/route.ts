import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { markBookingRefunded } from "@/services/bookings.service";
import { ServiceError } from "@/services/errors";

/** §G.3 — admin marks a booking's refund as processed, after doing it manually in the Stripe dashboard. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const booking = await markBookingRefunded(id);
    void import("@/services/email.service").then(({ sendRefundConfirmed }) =>
      sendRefundConfirmed(booking.id).catch(() => {})
    );
    return NextResponse.json({ booking: { id: booking.id, status: "REFUNDED" } });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
