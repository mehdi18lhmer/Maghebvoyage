import { notFound } from "next/navigation";
import { AgencyDetailView } from "@/components/admin/agency-detail-view";
import { prisma } from "@/lib/prisma";
import { mapAgency, mapTrip } from "@/lib/db-mappers";

export default async function AdminAgencyDetailPage({ params }: PageProps<"/admin/agences/[id]">) {
  const { id } = await params;

  const [row, statusHistory, tripRows] = await Promise.all([
    prisma.agency.findUnique({ where: { id } }),
    prisma.agencyStatusHistory.findMany({ where: { agencyId: id }, orderBy: { createdAt: "asc" } }),
    prisma.groupTrip.findMany({ where: { agencyId: id }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!row) notFound();

  return (
    <AgencyDetailView agency={mapAgency(row, statusHistory)} trips={tripRows.map(mapTrip)} />
  );
}
