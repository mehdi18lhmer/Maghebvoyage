import { NextResponse } from "next/server";
import { z } from "zod";
import { registerAgency } from "@/services/agency.service";
import { sendAgencyRegistrationSubmitted } from "@/services/email.service";
import { ServiceError } from "@/services/errors";

/**
 * §J.1 — public registration. No auth required (nobody has an account yet).
 *
 * `verificationDocUrl` is taken as a string, not a file: no object-storage
 * service (Cloudinary/Supabase Storage, per CDC §5.1) is wired up yet, so
 * there is nowhere real to upload the PDF to. The client currently sends the
 * file's name as a placeholder — this is a known, flagged gap, not a silent
 * shortcut: real upload needs a storage integration before this is genuinely
 * done per §J.1's "Document justificatif Upload PDF Oui".
 */
const BodySchema = z.object({
  name: z.string().min(1),
  managerName: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1),
  country: z.string().min(1),
  city: z.string().min(1),
  description: z.string().min(1),
  zones: z.array(z.string()).min(1),
  tripTypes: z
    .array(z.enum(["DESERT", "TREKKING", "BEACH", "CULTURAL", "ADVENTURE", "CITY_BREAK", "GASTRONOMY", "PILGRIMAGE"]))
    .min(1),
  password: z.string().min(1),
  verificationDocUrl: z.string().min(1),
  registrationNumber: z.string().optional(),
  gdprConsent: z.literal(true),
  termsAccepted: z.literal(true),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Formulaire invalide.", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const agency = await registerAgency(parsed.data);
    // E4 + E5, fired after commit so a mail failure can never roll back a
    // successful registration.
    void sendAgencyRegistrationSubmitted(agency.id).catch((err) =>
      console.error("[agencies:register] E4/E5 failed", { agencyId: agency.id, err })
    );
    return NextResponse.json({ agencyId: agency.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
    }
    throw err;
  }
}
