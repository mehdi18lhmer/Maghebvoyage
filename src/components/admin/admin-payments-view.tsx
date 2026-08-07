"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
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
import type { Agency, Booking, GroupTrip, Payment } from "@/lib/types";

export function AdminPaymentsView({
  payments,
  bookings,
  trips,
  agencies,
}: {
  payments: Payment[];
  bookings: Booking[];
  trips: GroupTrip[];
  agencies: Agency[];
}) {
  const [agencyFilter, setAgencyFilter] = useState("ALL");
  const [period, setPeriod] = useState<"ALL" | "THIS_MONTH" | "LAST_MONTH">("ALL");

  function bookingOf(p: Payment) {
    return bookings.find((b) => b.id === p.bookingId);
  }
  function tripOf(p: Payment) {
    const booking = bookingOf(p);
    return booking ? trips.find((t) => t.id === booking.groupTripId) : undefined;
  }
  function agencyOf(p: Payment) {
    const trip = tripOf(p);
    return trip ? agencies.find((a) => a.id === trip.agencyId) : undefined;
  }

  const filtered = useMemo(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return payments
      .filter((p) => agencyFilter === "ALL" || agencyOf(p)?.id === agencyFilter)
      .filter((p) => {
        if (period === "ALL") return true;
        const d = new Date(p.createdAt);
        if (period === "THIS_MONTH") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, agencyFilter, period]);

  const total = filtered.reduce((sum, p) => sum + p.amount, 0);
  const succeeded = filtered.filter((p) => p.status === "SUCCEEDED").reduce((sum, p) => sum + p.amount, 0);
  const refunded = filtered.filter((p) => p.status === "REFUNDED").reduce((sum, p) => sum + p.amount, 0);

  const columns: DataTableColumn<Payment>[] = [
    { key: "client", header: "Client", cell: (p) => bookingOf(p)?.clientName ?? "—" },
    { key: "trip", header: "Voyage", cell: (p) => tripOf(p)?.title ?? "—" },
    { key: "agency", header: "Agence", cell: (p) => agencyOf(p)?.name ?? "—" },
    { key: "amount", header: "Montant", sortable: true, sortValue: (p) => p.amount, cell: (p) => formatPrice(p.amount) },
    { key: "status", header: "Statut", cell: (p) => <StatusBadge kind="payment" status={p.status} /> },
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (p) => p.createdAt,
      cell: (p) => formatDate(p.createdAt),
    },
    {
      key: "stripe",
      header: "",
      className: "text-right",
      cell: (p) => (
        <a
          href={`https://dashboard.stripe.com/test/payments/${p.stripeSessionId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary underline"
          onClick={(e) => e.stopPropagation()}
        >
          Stripe <ExternalLink className="size-3.5" />
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <Select value={agencyFilter} onValueChange={setAgencyFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Agence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes les agences</SelectItem>
            {agencies.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger>
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toute période</SelectItem>
            <SelectItem value="THIS_MONTH">Ce mois-ci</SelectItem>
            <SelectItem value="LAST_MONTH">Mois dernier</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total sur la période" value={formatPrice(total)} />
        <KpiCard label="Paiements réussis" value={formatPrice(succeeded)} />
        <KpiCard label="Remboursés" value={formatPrice(refunded)} />
      </div>

      <DataTable columns={columns} data={filtered} getRowId={(p) => p.id} emptyState="Aucun paiement trouvé." />
    </div>
  );
}
