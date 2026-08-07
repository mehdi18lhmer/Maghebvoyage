import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { suspendTripByAdmin } from "@/services/trips.service";
import { ServiceError } from "@/services/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const trip = await suspendTripByAdmin(id);
    return NextResponse.json({ trip });
  } catch (err) {
    if (err instanceof ServiceError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
