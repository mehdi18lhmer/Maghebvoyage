import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { reactivateAgency } from "@/services/agency.service";
import { ServiceError } from "@/services/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const agency = await reactivateAgency(id);
    return NextResponse.json({ agency });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
