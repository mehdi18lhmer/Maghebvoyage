import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { updateTrip } from "@/services/trips.service";
import { ServiceError } from "@/services/errors";

/**
 * Every TripDraftInput field, optional. Which of these `updateTrip()` actually
 * accepts depends on the trip's current status (§D: PUBLISHED only allows
 * description/images/coverImage/meetingPoint) — that whitelist lives in the
 * service, not here. This schema only guards *shape*, not *permission*.
 */
const PatchSchema = z.object({
  title: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  tripType: z
    .enum(["DESERT", "TREKKING", "BEACH", "CULTURAL", "ADVENTURE", "CITY_BREAK", "GASTRONOMY", "PILGRIMAGE"])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  totalPrice: z.number().optional(),
  depositAmount: z.number().optional(),
  currency: z.string().optional(),
  totalSpots: z.number().int().optional(),
  coverImage: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  meetingPoint: z.string().nullable().optional(),
  programDays: z.string().nullable().optional(),
  physicalLevel: z.enum(["EASY", "MEDIUM", "SPORT", "EXPERT"]).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "AGENCY" || !session.user.agencyId) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await params;
  const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Formulaire invalide.", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { startDate, endDate, ...rest } = parsed.data;

  try {
    const trip = await updateTrip(id, session.user.agencyId, {
      ...rest,
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
    });
    return NextResponse.json({ trip });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
    }
    throw err;
  }
}
