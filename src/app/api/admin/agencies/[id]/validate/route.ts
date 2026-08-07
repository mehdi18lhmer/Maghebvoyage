import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyAgency } from "@/services/agency.service";
import { sendAgencyVerified } from "@/services/email.service";
import { ServiceError } from "@/services/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const agency = await verifyAgency(id, session.user.id!);
    // E6, after the transition has actually committed.
    void sendAgencyVerified(agency.id).catch((err) =>
      console.error("[admin:agencies:validate] E6 failed", { agencyId: agency.id, err })
    );
    return NextResponse.json({ agency });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
