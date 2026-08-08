import { NextResponse } from "next/server";
import { z } from "zod";
import { registerClient } from "@/services/auth.service";
import { ServiceError } from "@/services/errors";

const BodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
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
    await registerClient(parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
    }
    throw err;
  }
}
