import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { suspendAgency } from "@/services/agency.service";
import { ServiceError } from "@/services/errors";

const BodySchema = z.object({ reason: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await params;
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Le motif de suspension est obligatoire." }, { status: 422 });
  }

  try {
    const agency = await suspendAgency(id, parsed.data.reason);
    return NextResponse.json({ agency });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
