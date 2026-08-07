import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { cancelBookingByAdmin } from "@/services/bookings.service";
import { ServiceError } from "@/services/errors";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await params;
  const parsed = z.object({ reason: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Le motif d'annulation est obligatoire." }, { status: 422 });
  }

  try {
    const booking = await cancelBookingByAdmin(id, parsed.data.reason);
    void import("@/services/email.service").then(({ sendClientCancellation }) =>
      sendClientCancellation(booking.id).catch(() => {})
    );
    return NextResponse.json({ booking: { id: booking.id, status: "CANCELLED" } });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
