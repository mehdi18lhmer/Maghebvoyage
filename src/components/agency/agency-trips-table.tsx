"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Ticket,
  Ban,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDateRange } from "@/lib/format";
import type { GroupTrip, GroupTripStatus } from "@/lib/types";

const TABS: { value: GroupTripStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "DRAFT", label: "Brouillons" },
  { value: "PUBLISHED", label: "Publiés" },
  { value: "FULL", label: "Complets" },
  { value: "CLOSED", label: "Clôturés" },
  { value: "CANCELLED", label: "Annulés" },
];

export function AgencyTripsTable({ trips }: { trips: GroupTrip[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<GroupTripStatus | "ALL">("ALL");
  const [cancelTarget, setCancelTarget] = useState<GroupTrip | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // `trips` is read straight from props rather than copied into local state:
  // every action below calls router.refresh(), which re-runs the parent
  // server component and hands down fresh data. A local copy would just be a
  // second source of truth that the refresh has to remember to reconcile.
  const filtered = useMemo(
    () => (tab === "ALL" ? trips : trips.filter((t) => t.status === tab)),
    [trips, tab]
  );

  async function closeTrip(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/trips/${id}/close`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Impossible de clôturer ce voyage.");
        return;
      }
      toast.success("Voyage clôturé");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setBusyId(cancelTarget.id);
    try {
      const res = await fetch(`/api/trips/${cancelTarget.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Impossible d'annuler ce voyage.");
        return;
      }
      toast.success("Voyage annulé, les clients ont été notifiés");
      router.refresh();
    } finally {
      setBusyId(null);
      setCancelTarget(null);
      setReason("");
    }
  }

  function tripUrl(trip: GroupTrip) {
    if (typeof window === "undefined") return `/trip/${trip.slug}`;
    return `${window.location.origin}/trip/${trip.slug}`;
  }

  const columns: DataTableColumn<GroupTrip>[] = [
    { key: "title", header: "Voyage", cell: (t) => <span className="font-medium">{t.title}</span> },
    { key: "destination", header: "Destination", cell: (t) => t.destination },
    {
      key: "dates",
      header: "Dates",
      sortable: true,
      sortValue: (t) => t.startDate,
      cell: (t) => formatDateRange(t.startDate, t.endDate),
    },
    { key: "seats", header: "Places", cell: (t) => `${t.bookedSpots}/${t.totalSpots}` },
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
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem asChild>
              <Link href={`/trip/${t.slug}`} target="_blank">
                <Eye className="size-4" /> Voir la page publique
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/agency/voyages/new?edit=${t.id}`)}>
              <Pencil className="size-4" /> Modifier
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(tripUrl(t));
                toast.success("Lien magique copié");
              }}
            >
              <Copy className="size-4" /> Copier le lien
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${t.title} — ${tripUrl(t)}`)}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-4" /> Partager sur WhatsApp
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/agency/reservations?trip=${t.id}`)}>
              <Ticket className="size-4" /> Voir les réservations
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {(t.status === "PUBLISHED" || t.status === "FULL") && (
              <DropdownMenuItem disabled={busyId === t.id} onClick={() => closeTrip(t.id)}>
                <Ban className="size-4" /> Clôturer
              </DropdownMenuItem>
            )}
            {t.status !== "CANCELLED" && (
              <DropdownMenuItem
                variant="destructive"
                disabled={busyId === t.id}
                onClick={() => setCancelTarget(t)}
              >
                <XCircle className="size-4" /> Annuler le voyage
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as GroupTripStatus | "ALL")}>
        <TabsList className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(t) => t.id}
        emptyState="Aucun voyage dans cette catégorie."
      />

      <Dialog open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler {cancelTarget?.title}</DialogTitle>
            <DialogDescription>
              Toutes les réservations confirmées seront automatiquement annulées et un email sera envoyé à chaque
              client concerné (E11) ainsi qu&apos;à l&apos;administration (E12). Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Raison de l&apos;annulation *</Label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Retour
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || busyId === cancelTarget?.id}
              onClick={confirmCancel}
            >
              Confirmer l&apos;annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
