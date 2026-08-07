import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgencyTripsTable } from "@/components/agency/agency-trips-table";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mapTrip } from "@/lib/db-mappers";

export default async function AgencyTripsPage() {
  // agency/layout.tsx already redirects if there's no session/agencyId — this
  // repeats the read rather than trusting a prop, so this page can never
  // render another agency's trips if it's ever reached a different way.
  const session = await auth();
  const agencyId = session!.user.agencyId!;

  const rows = await prisma.groupTrip.findMany({
    where: { agencyId },
    orderBy: { createdAt: "desc" },
  });
  const trips = rows.map(mapTrip);

  const agency = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">Mes voyages</h1>
          <p className="mt-1 text-muted-foreground">Gérez les voyages publiés par {agency.name}.</p>
        </div>
        <Button asChild>
          <Link href="/agency/voyages/new">
            <PlusCircle className="size-4" />
            Publier un voyage
          </Link>
        </Button>
      </div>

      <AgencyTripsTable trips={trips} />
    </div>
  );
}
