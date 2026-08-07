"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, MoreHorizontal, PauseCircle, PlayCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, tripTypeLabel } from "@/lib/format";
import type { Agency, GroupTrip, GroupTripStatus, TripType } from "@/lib/types";

const STATUSES: (GroupTripStatus | "ALL")[] = ["ALL", "DRAFT", "PUBLISHED", "FULL", "CLOSED", "CANCELLED"];
const TYPES: (TripType | "ALL")[] = [
  "ALL",
  "DESERT",
  "TREKKING",
  "BEACH",
  "CULTURAL",
  "ADVENTURE",
  "CITY_BREAK",
  "GASTRONOMY",
  "PILGRIMAGE",
];

export function AdminTripsTable({ trips, agencies }: { trips: GroupTrip[]; agencies: Agency[] }) {
  const [items, setItems] = useState(trips);
  const [agencyFilter, setAgencyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<GroupTripStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<TripType | "ALL">("ALL");
  const [destination, setDestination] = useState("");

  function agencyName(id: string) {
    return agencies.find((a) => a.id === id)?.name ?? "—";
  }

  const filtered = useMemo(() => {
    return items
      .filter((t) => agencyFilter === "ALL" || t.agencyId === agencyFilter)
      .filter((t) => statusFilter === "ALL" || t.status === statusFilter)
      .filter((t) => typeFilter === "ALL" || t.tripType === typeFilter)
      .filter((t) => destination.trim() === "" || t.destination.toLowerCase().includes(destination.toLowerCase()));
  }, [items, agencyFilter, statusFilter, typeFilter, destination]);

  /**
   * §K.3's suspend/reactivate, against the real admin-scoped routes (no
   * agency ownership check — admin acts across any agency). The list updates
   * optimistically since there's nothing else on this page to re-derive it
   * from; a failed request rolls the row back rather than leaving a false
   * status on screen.
   */
  async function updateStatus(id: string, action: "suspend" | "reactivate", nextStatus: GroupTripStatus) {
    const previous = items;
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)));

    try {
      const res = await fetch(`/api/admin/trips/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setItems(previous);
        toast.error(data.error ?? "Une erreur est survenue.");
        return;
      }
      toast.success(action === "suspend" ? "Voyage suspendu par l'administration" : "Voyage réactivé");
    } catch {
      setItems(previous);
      toast.error("Impossible de contacter le serveur.");
    }
  }

  const columns: DataTableColumn<GroupTrip>[] = [
    { key: "title", header: "Voyage", cell: (t) => <span className="font-medium">{t.title}</span> },
    { key: "agency", header: "Agence", cell: (t) => agencyName(t.agencyId) },
    { key: "destination", header: "Destination", cell: (t) => t.destination },
    { key: "type", header: "Type", cell: (t) => tripTypeLabel(t.tripType) },
    {
      key: "start",
      header: "Départ",
      sortable: true,
      sortValue: (t) => t.startDate,
      cell: (t) => formatDate(t.startDate),
    },
    { key: "status", header: "Statut", cell: (t) => <StatusBadge kind="trip" status={t.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (t) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/trip/${t.slug}`} target="_blank">
                <Eye className="size-4" /> Voir la page publique
              </Link>
            </DropdownMenuItem>
            {(t.status === "PUBLISHED" || t.status === "FULL") && (
              <DropdownMenuItem onClick={() => updateStatus(t.id, "suspend", "CLOSED")}>
                <PauseCircle className="size-4" /> Suspendre
              </DropdownMenuItem>
            )}
            {t.status === "CLOSED" && (
              <DropdownMenuItem onClick={() => updateStatus(t.id, "reactivate", "PUBLISHED")}>
                <PlayCircle className="size-4" /> Réactiver
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as GroupTripStatus | "ALL")}>
          <SelectTrigger>
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "Tous les statuts" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TripType | "ALL")}>
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "ALL" ? "Tous les types" : tripTypeLabel(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Filtrer par destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>

      <DataTable columns={columns} data={filtered} getRowId={(t) => t.id} emptyState="Aucun voyage trouvé." />
    </div>
  );
}
