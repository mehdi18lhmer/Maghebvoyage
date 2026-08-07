import { AgenciesTable } from "@/components/admin/agencies-table";
import { prisma } from "@/lib/prisma";
import { mapAgency } from "@/lib/db-mappers";

export default async function AdminAgenciesPage() {
  const rows = await prisma.agency.findMany({ orderBy: { createdAt: "desc" } });
  const agencies = rows.map((a) => mapAgency(a));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Gestion des agences</h1>
        <p className="text-muted-foreground">Vérifiez, validez ou suspendez les agences partenaires.</p>
      </div>
      <AgenciesTable agencies={agencies} />
    </div>
  );
}
