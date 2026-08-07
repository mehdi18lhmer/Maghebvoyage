"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import type { Booking } from "@/lib/types";

// See src/components/agency/home-tables.tsx for why this needs its own file:
// column defs hold functions, and the parent page is a Server Component doing
// the real Prisma queries — functions can't cross that boundary as props.
const columns: DataTableColumn<Booking & { tripTitle: string }>[] = [
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

export function HomeBookingsTable({ bookings }: { bookings: (Booking & { tripTitle: string })[] }) {
  return (
    <DataTable
      columns={columns}
      data={bookings}
      getRowId={(b) => b.id}
      emptyState="Aucune réservation pour le moment."
    />
  );
}
