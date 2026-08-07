"use client";

import { BarChart3, MapPin } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { trips, travelRequests } from "@/lib/mock-data";
import { formatDate, tripTypeLabel } from "@/lib/format";
import type { TravelRequest } from "@/lib/types";

function topCounts(entries: string[], limit = 3) {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e, (counts.get(e) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export default function AdminAiRequestsPage() {
  const topDestinations = topCounts(travelRequests.map((r) => r.destination));
  const topTypes = topCounts(travelRequests.flatMap((r) => r.tripTypes));
  const converted = travelRequests.filter((r) => r.status === "PAID" || r.status === "CLOSED").length;
  const conversionRate = travelRequests.length > 0 ? Math.round((converted / travelRequests.length) * 100) : 0;
  const avgBudget = Math.round(
    travelRequests.reduce((sum, r) => sum + r.budgetMax, 0) / (travelRequests.length || 1)
  );

  const columns: DataTableColumn<TravelRequest>[] = [
    { key: "client", header: "Client", cell: (r) => r.clientName },
    { key: "destination", header: "Destination souhaitée", cell: (r) => r.destination },
    { key: "travelers", header: "Voyageurs", cell: (r) => r.travelerCount },
    { key: "budget", header: "Budget max", cell: (r) => `${r.budgetMax} €` },
    { key: "status", header: "Statut", cell: (r) => <StatusBadge kind="travelRequest" status={r.status} /> },
    {
      key: "match",
      header: "Voyage suggéré",
      cell: (r) => {
        const first = r.matchedTripIds?.[0];
        const trip = first ? trips.find((t) => t.id === first) : undefined;
        return trip ? trip.title : "En attente";
      },
    },
    {
      key: "date",
      header: "Soumise le",
      sortable: true,
      sortValue: (r) => r.createdAt,
      cell: (r) => formatDate(r.createdAt),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Demandes IA (Chemin A)</h1>
        <p className="text-muted-foreground">Suivi des demandes soumises via le formulaire assisté par IA.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Demandes reçues" value={travelRequests.length} />
        <KpiCard label="Taux de conversion" value={`${conversionRate}%`} />
        <KpiCard label="Budget moyen demandé" value={`${avgBudget} €`} />
        <KpiCard label="Destination la + demandée" value={topDestinations[0]?.[0] ?? "—"} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-5">
          <p className="flex items-center gap-2 font-semibold">
            <MapPin className="size-4 text-muted-foreground" />
            Top destinations demandées
          </p>
          <ul className="space-y-2 text-sm">
            {topDestinations.map(([dest, count]) => (
              <li key={dest} className="flex justify-between">
                <span>{dest}</span>
                <span className="text-muted-foreground">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="space-y-3 p-5">
          <p className="flex items-center gap-2 font-semibold">
            <BarChart3 className="size-4 text-muted-foreground" />
            Top types de voyage demandés
          </p>
          <ul className="space-y-2 text-sm">
            {topTypes.map(([type, count]) => (
              <li key={type} className="flex justify-between">
                <span>{tripTypeLabel(type)}</span>
                <span className="text-muted-foreground">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Toutes les demandes</h2>
        <DataTable columns={columns} data={travelRequests} getRowId={(r) => r.id} />
      </section>
    </div>
  );
}
