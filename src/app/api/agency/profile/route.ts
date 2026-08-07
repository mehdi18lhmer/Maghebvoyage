import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { updateAgencyProfile } from "@/services/agency.service";
import { ServiceError } from "@/services/errors";

/** §J.7 — editable: name, description, zones, specialties, phone, logo. Email is the login, never editable here. */
const BodySchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(100).optional(),
  contactPhone: z.string().min(1).optional(),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "AGENCY" || !session.user.agencyId) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Formulaire invalide.", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const agency = await updateAgencyProfile(session.user.agencyId, parsed.data);
    return NextResponse.json({ agency });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
    }
    throw err;
  }
}
