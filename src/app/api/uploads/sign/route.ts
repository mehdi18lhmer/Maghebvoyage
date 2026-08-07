import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { signUpload, isCloudinaryConfigured } from "@/lib/cloudinary";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Issues a Cloudinary upload signature. Two callers, two different trust
 * levels, so the policy branches on `kind` rather than being one-size-fits-all:
 *
 *  - "trip-photo": the agency dashboard's publish wizard (§J.4). Requires a
 *    real AGENCY session — the folder is scoped to that agency's own id, so
 *    even a signed request can't be replayed to write into another agency's
 *    folder.
 *  - "agency-document": the public registration form (§J.1). Necessarily
 *    unauthenticated — there's no account yet at this point in the flow —
 *    so it's rate-limited by IP instead, same abuse-surface reasoning as
 *    §10's limit on /bookings/initiate.
 */

const BodySchema = z.object({ kind: z.enum(["trip-photo", "agency-document"]) });

export async function POST(request: Request) {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Le stockage d'images n'est pas configuré." }, { status: 500 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (parsed.data.kind === "trip-photo") {
    const session = await auth();
    if (!session?.user || session.user.role !== "AGENCY" || !session.user.agencyId) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const signed = signUpload({ folder: `maghrebvoyage/trips/${session.user.agencyId}` });
    return NextResponse.json(signed);
  }

  // "agency-document" — no session possible yet, so IP-rate-limited instead.
  const ip = clientIp(request);
  const limit = await rateLimit(`uploads:agency-document:${ip}`, 10, 60 * 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives d'envoi. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }

  const signed = signUpload({ folder: "maghrebvoyage/agency-documents" });
  return NextResponse.json(signed);
}
