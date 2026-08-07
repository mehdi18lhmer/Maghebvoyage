import { AdminTripsTable } from "@/components/admin/admin-trips-table";
import { prisma } from "@/lib/prisma";
import { mapAgency, mapTrip } from "@/lib/db-mappers";

export default async function AdminTripsPage() {
  const [tripRows, agencyRows] = await Promise.all([
    prisma.groupTrip.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.agency.findMany(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Gestion des voyages</h1>
        <p className="text-muted-foreground">Tous les voyages publiés sur la plateforme, toutes agences confondues.</p>
      </div>
      <AdminTripsTable trips={tripRows.map(mapTrip)} agencies={agencyRows.map((a) => mapAgency(a))} />
    </div>
  );
}
