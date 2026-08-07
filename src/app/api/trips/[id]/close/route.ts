import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { closeTrip } from "@/services/trips.service";
import { ServiceError } from "@/services/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "AGENCY" || !session.user.agencyId) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const trip = await closeTrip(id, session.user.agencyId);
    return NextResponse.json({ trip });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
    }
    throw err;
  }
}
