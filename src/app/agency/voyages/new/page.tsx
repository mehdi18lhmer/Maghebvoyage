import { Suspense } from "react";
import { TripWizard } from "@/components/agency/trip-wizard";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mapTrip } from "@/lib/db-mappers";

async function WizardWithEdit({ searchParams }: PageProps<"/agency/voyages/new">) {
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : undefined;

  const session = await auth();
  const agencyId = session!.user.agencyId!;

  // Scoped by agencyId in the same query, not filtered afterward — a row that
  // exists but belongs to another agency must come back as "not found", not
  // as a 200 the wizard then happily renders.
  const row = editId
    ? await prisma.groupTrip.findFirst({ where: { id: editId, agencyId } })
    : null;
  const existingTrip = row ? mapTrip(row) : undefined;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">
          {existingTrip ? "Modifier le voyage" : "Publier un voyage"}
        </h1>
        <p className="text-muted-foreground">
          {existingTrip
            ? `Mise à jour de "${existingTrip.title}".`
            : "Quatre étapes pour publier un nouveau voyage en groupe."}
        </p>
      </div>
      <TripWizard existingTrip={existingTrip} />
    </div>
  );
}

export default function NewTripPage(props: PageProps<"/agency/voyages/new">) {
  return (
    <Suspense>
      <WizardWithEdit {...props} />
    </Suspense>
  );
}
