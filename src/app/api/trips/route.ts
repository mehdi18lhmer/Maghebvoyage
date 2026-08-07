import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createDraft } from "@/services/trips.service";
import { ServiceError } from "@/services/errors";

/** CDC §J.4 — the 4-step publish wizard's fields, minus what's computed server-side. */
const TripInputSchema = z.object({
  title: z.string().min(1),
  destination: z.string().min(1),
  description: z.string().min(1),
  tripType: z.enum([
    "DESERT", "TREKKING", "BEACH", "CULTURAL",
    "ADVENTURE", "CITY_BREAK", "GASTRONOMY", "PILGRIMAGE",
  ]),
  startDate: z.string(),
  endDate: z.string(),
  totalPrice: z.number(),
  depositAmount: z.number(),
  currency: z.string().optional(),
  totalSpots: z.number().int(),
  coverImage: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  meetingPoint: z.string().nullable().optional(),
  programDays: z.string().nullable().optional(),
  physicalLevel: z.enum(["EASY", "MEDIUM", "SPORT", "EXPERT"]).nullable().optional(),
});

export async function POST(request: Request) {
  // CDC §5.3 — every protected route calls getServerSession()/role check
  // before doing anything, not just relying on the proxy.
  const session = await auth();
  if (!session?.user || session.user.role !== "AGENCY" || !session.user.agencyId) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = TripInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Formulaire invalide.", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const trip = await createDraft(session.user.agencyId, {
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
    });
    return NextResponse.json({ trip }, { status: 201 });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
    }
    throw err;
  }
}
