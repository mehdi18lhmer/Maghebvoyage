"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatPrice } from "@/lib/format";
import type { Booking, GroupTrip, Payment } from "@/lib/types";

export function AgencyReservationsView({
  bookings,
  trips,
  payments,
  initialTripId,
}: {
  bookings: Booking[];
  trips: GroupTrip[];
  payments: Payment[];
  initialTripId?: string;
}) {
  const [tripFilter, setTripFilter] = useState(initialTripId ?? "all");

  const filtered = useMemo(
    () => (tripFilter === "all" ? bookings : bookings.filter((b) => b.groupTripId === tripFilter)),
    [bookings, tripFilter]
  );

  const seatsBooked = filtered
    .filter((b) => b.status === "CONFIRMED")
    .reduce((sum, b) => sum + b.numberOfSeats, 0);
  const totalSeats = trips
    .filter((t) => tripFilter === "all" || t.id === tripFilter)
    .reduce((sum, t) => sum + t.totalSpots, 0);
  const depositsCollected = filtered.reduce((sum, b) => {
    const p = payments.find((pay) => pay.bookingId === b.id);
    return p && p.status === "SUCCEEDED" ? sum + p.amount : sum;
  }, 0);

  function tripTitle(id: string) {
    return trips.find((t) => t.id === id)?.title ?? "—";
  }

  function exportCsv() {
    const header = ["Client", "Email", "Voyage", "Places", "Statut", "Code", "Date"];
    const rows = filtered.map((b) => [
      b.clientName,
      b.clientEmail,
      tripTitle(b.groupTripId),
      String(b.numberOfSeats),
      b.status,
      b.confirmationCode ?? "",
      formatDate(b.createdAt),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reservations.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: DataTableColumn<Booking>[] = [
    { key: "client", header: "Client", cell: (b) => b.clientName },
    { key: "email", header: "Email", cell: (b) => b.clientEmail },
    { key: "trip", header: "Voyage", cell: (b) => tripTitle(b.groupTripId) },
    { key: "seats", header: "Places", cell: (b) => b.numberOfSeats },
    { key: "status", header: "Statut", cell: (b) => <StatusBadge kind="booking" status={b.status} /> },
    { key: "code", header: "Code", cell: (b) => b.confirmationCode ?? "—" },
    {
      key: "date",
      header: "Réservé le",
      sortable: true,
      sortValue: (b) => b.createdAt,
      cell: (b) => formatDate(b.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={tripFilter} onValueChange={setTripFilter}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les réservations</SelectItem>
            {trips.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="size-4" />
          Exporter en CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Places réservées" value={`${seatsBooked}/${totalSeats}`} />
        <KpiCard label="Réservations" value={filtered.length} />
        <KpiCard label="Acomptes perçus" value={formatPrice(depositsCollected)} />
      </div>

      <DataTable columns={columns} data={filtered} getRowId={(b) => b.id} emptyState="Aucune réservation." />
    </div>
  );
}
