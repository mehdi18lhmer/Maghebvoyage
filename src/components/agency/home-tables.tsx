"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import type { Booking, GroupTrip } from "@/lib/types";

/**
 * Column definitions contain functions (`cell`, `sortValue`), and the parent
 * page (agency/page.tsx) is a Server Component doing the actual Prisma
 * queries — functions can't cross that server/client boundary as props. This
 * client component owns the columns itself and only ever receives plain,
 * already-serializable data from the server page.
 */

const bookingColumns: DataTableColumn<Booking & { tripTitle: string }>[] = [
  { key: "client", header: "Client", cell: (b) => b.clientName },
  { key: "trip", header: "Voyage", cell: (b) => b.tripTitle },
  { key: "seats", header: "Places", cell: (b) => b.numberOfSeats },
  { key: "status", header: "Statut", cell: (b) => <StatusBadge kind="booking" status={b.status} /> },
  {
    key: "date",
    header: "Réservé le",
    sortable: true,
    sortValue: (b) => b.createdAt,
    cell: (b) => formatDate(b.createdAt),
  },
];

const departureColumns: DataTableColumn<GroupTrip>[] = [
  { key: "title", header: "Voyage", cell: (t) => t.title },
  { key: "destination", header: "Destination", cell: (t) => t.destination },
  {
    key: "date",
    header: "Départ",
    sortable: true,
    sortValue: (t) => t.startDate,
    cell: (t) => formatDate(t.startDate),
  },
  { key: "seats", header: "Places", cell: (t) => `${t.bookedSpots}/${t.totalSpots}` },
];

export function LastBookingsTable({ bookings }: { bookings: (Booking & { tripTitle: string })[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-bold">Dernières réservations</h2>
      <DataTable
        columns={bookingColumns}
        data={bookings}
        getRowId={(b) => b.id}
        emptyState="Aucune réservation pour le moment."
      />
      {bookings.length > 0 && (
        <Link
          href="/agency/reservations"
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          Voir toutes les réservations
        </Link>
      )}
    </section>
  );
}

export function UpcomingDeparturesTable({ trips }: { trips: GroupTrip[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-bold">Départs dans les 30 prochains jours</h2>
      <DataTable
        columns={departureColumns}
        data={trips}
        getRowId={(t) => t.id}
        emptyState="Aucun départ prévu dans les 30 prochains jours."
      />
    </section>
  );
}
