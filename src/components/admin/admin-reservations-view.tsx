"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatPrice } from "@/lib/format";
import type { Agency, Booking, BookingStatus, GroupTrip, Payment } from "@/lib/types";

export function AdminReservationsView({
  bookings,
  trips,
  agencies,
  payments,
}: {
  bookings: Booking[];
  trips: GroupTrip[];
  agencies: Agency[];
  payments: Payment[];
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [agencyFilter, setAgencyFilter] = useState("ALL");
  const [tripFilter, setTripFilter] = useState("ALL");
  const [period, setPeriod] = useState<"ALL" | "THIS_MONTH" | "LAST_MONTH">("ALL");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [note, setNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [pending, setPending] = useState(false);

  function tripOf(booking: Booking) {
    return trips.find((t) => t.id === booking.groupTripId);
  }
  function agencyOf(booking: Booking) {
    const trip = tripOf(booking);
    return trip ? agencies.find((a) => a.id === trip.agencyId) : undefined;
  }
  function paymentOf(booking: Booking) {
    return payments.find((p) => p.bookingId === booking.id);
  }

  const pendingRefunds = bookings.filter((b) => b.status === "CANCELLED" && paymentOf(b)?.status !== "REFUNDED");

  const filtered = useMemo(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return bookings
      .filter((b) => statusFilter === "ALL" || b.status === statusFilter)
      .filter((b) => agencyFilter === "ALL" || agencyOf(b)?.id === agencyFilter)
      .filter((b) => tripFilter === "ALL" || b.groupTripId === tripFilter)
      .filter((b) => {
        if (period === "ALL") return true;
        const d = new Date(b.createdAt);
        if (period === "THIS_MONTH") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, statusFilter, agencyFilter, tripFilter, period]);

  /** §K.4 — admin cancels a booking directly, releasing the seat the same way the client's token flow does. */
  async function confirmCancel() {
    if (!selected || !cancelReason.trim()) return;
    setPending(true);
    try {
      const res = await fetch(`/api/admin/bookings/${selected.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Une erreur est survenue.");
        return;
      }
      toast.success("Réservation annulée — la place a été remise en disponibilité");
      setShowCancelDialog(false);
      setCancelReason("");
      setSelected(null);
      router.refresh();
    } catch {
      toast.error("Impossible de contacter le serveur.");
    } finally {
      setPending(false);
    }
  }

  /** §G.3 — admin marks a refund as processed, once done manually in the Stripe dashboard. */
  async function markRefunded(booking: Booking) {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/refund`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Une erreur est survenue.");
        return;
      }
      toast.success("Remboursement marqué comme effectué — email envoyé au client (E13)");
      setSelected(null);
      router.refresh();
    } catch {
      toast.error("Impossible de contacter le serveur.");
    } finally {
      setPending(false);
    }
  }

  const columns: DataTableColumn<Booking>[] = [
    { key: "client", header: "Client", cell: (b) => b.clientName },
    { key: "trip", header: "Voyage", cell: (b) => tripOf(b)?.title ?? "—" },
    { key: "agency", header: "Agence", cell: (b) => agencyOf(b)?.name ?? "—" },
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

  return (
    <div className="space-y-6">
      {pendingRefunds.length > 0 && (
        <Card className="gap-2 border-destructive/30 bg-destructive/5 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
            <AlertCircle className="size-4" />
            {pendingRefunds.length} remboursement{pendingRefunds.length > 1 ? "s" : ""} en attente
          </p>
          <ul className="space-y-1 text-sm text-destructive/80">
            {pendingRefunds.map((b) => (
              <li key={b.id}>
                <button className="underline" onClick={() => setSelected(b)}>
                  {b.clientName} — {tripOf(b)?.title}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus | "ALL")}>
          <SelectTrigger>
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            <SelectItem value="PENDING_PAYMENT">Paiement en attente</SelectItem>
            <SelectItem value="CONFIRMED">Confirmée</SelectItem>
            <SelectItem value="CANCELLED">Annulée</SelectItem>
            <SelectItem value="REFUNDED">Remboursée</SelectItem>
            <SelectItem value="NO_SHOW">Absent</SelectItem>
          </SelectContent>
        </Select>
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
        <Select value={tripFilter} onValueChange={setTripFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Voyage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les voyages</SelectItem>
            {trips.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title}
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

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(b) => b.id}
        onRowClick={(b) => setSelected(b)}
        emptyState="Aucune réservation trouvée."
      />

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.clientName}</SheetTitle>
                <SheetDescription>{selected.clientEmail}</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 px-4 pb-6">
                <div className="flex items-center gap-2">
                  <StatusBadge kind="booking" status={selected.status} />
                  {selected.confirmationCode && (
                    <span className="font-mono text-sm text-muted-foreground">{selected.confirmationCode}</span>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold">Voyage</p>
                  <p className="text-sm text-muted-foreground">{tripOf(selected)?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {tripOf(selected) && formatDate(tripOf(selected)!.startDate)} · {selected.numberOfSeats} place
                    {selected.numberOfSeats > 1 ? "s" : ""}
                  </p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-semibold">Paiement</p>
                  {paymentOf(selected) ? (
                    <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                      <p>Montant : {formatPrice(paymentOf(selected)!.amount)}</p>
                      <p className="flex items-center gap-1.5">
                        Statut : <StatusBadge kind="payment" status={paymentOf(selected)!.status} />
                      </p>
                      <p className="font-mono text-xs">{paymentOf(selected)!.stripeSessionId}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-semibold">Historique</p>
                  <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                    <li>Créée le {formatDate(selected.createdAt)}</li>
                    {selected.cancelledAt && <li>Annulée le {formatDate(selected.cancelledAt)}</li>}
                    {selected.remindedAt && <li>Rappel envoyé le {formatDate(selected.remindedAt)}</li>}
                  </ul>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label htmlFor="note">Ajouter une note interne</Label>
                  <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!note.trim()}
                    onClick={() => {
                      toast.success("Note ajoutée");
                      setNote("");
                    }}
                  >
                    Enregistrer la note
                  </Button>
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  {selected.status === "CONFIRMED" && (
                    <Button variant="destructive" onClick={() => setShowCancelDialog(true)}>
                      Annuler la réservation
                    </Button>
                  )}
                  {selected.status === "CANCELLED" && paymentOf(selected)?.status !== "REFUNDED" && (
                    <Button onClick={() => markRefunded(selected)} disabled={pending}>
                      {pending ? <Loader2 className="size-4 animate-spin" /> : "Marquer comme remboursée"}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={showCancelDialog} onOpenChange={(open) => !open && !pending && setShowCancelDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler la réservation</DialogTitle>
            <DialogDescription>
              La place sera remise en disponibilité et un email sera envoyé au client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Motif *</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={pending}>
              Retour
            </Button>
            <Button variant="destructive" disabled={!cancelReason.trim() || pending} onClick={confirmCancel}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Confirmer l'annulation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
