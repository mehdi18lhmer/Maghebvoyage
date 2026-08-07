"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { FileText, Loader2, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { TripCard } from "@/components/trips/trip-card";
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
import { formatDate } from "@/lib/format";
import type { Agency, GroupTrip } from "@/lib/types";

/**
 * §K.2's four transitions, wired to the real API routes built alongside
 * agency.service.ts. Each one calls the server, then `router.refresh()` —
 * rather than reconstructing statusHistory locally — so the timeline shown
 * always matches what AgencyStatusHistory actually holds, not a client-side
 * guess of it.
 */
const ACTION_ENDPOINTS = {
  validate: (id: string) => `/api/admin/agencies/${id}/validate`,
  reject: (id: string) => `/api/admin/agencies/${id}/reject`,
  suspend: (id: string) => `/api/admin/agencies/${id}/suspend`,
  reactivate: (id: string) => `/api/admin/agencies/${id}/reactivate`,
} as const;

export function AgencyDetailView({ agency, trips }: { agency: Agency; trips: GroupTrip[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"reject" | "suspend" | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function callAction(action: keyof typeof ACTION_ENDPOINTS, body?: { reason: string }) {
    setPending(true);
    try {
      const res = await fetch(ACTION_ENDPOINTS[action](agency.id), {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Une erreur est survenue.");
        return;
      }

      const messages: Record<keyof typeof ACTION_ENDPOINTS, string> = {
        validate: "Agence vérifiée — email de confirmation envoyé (E6)",
        reject: "Agence rejetée — email envoyé avec le motif (E7)",
        suspend: "Agence suspendue — ses voyages publiés sont fermés",
        reactivate: "Agence réactivée",
      };
      toast.success(messages[action]);
      setDialog(null);
      setReason("");
      router.refresh();
    } catch {
      toast.error("Impossible de contacter le serveur.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-muted">
            {agency.logoUrl && (
              <Image src={agency.logoUrl} alt={agency.name} fill sizes="64px" className="object-cover" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-bold">{agency.name}</h1>
              <StatusBadge kind="agency" status={agency.verificationStatus} />
            </div>
            <p className="text-sm text-muted-foreground">{agency.description}</p>
            <div className="flex flex-wrap gap-4 pt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" /> {agency.contactEmail}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5" /> {agency.contactPhone}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {agency.zones.join(", ")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(agency.verificationStatus === "PENDING" || agency.verificationStatus === "UNDER_REVIEW") && (
            <>
              <Button onClick={() => callAction("validate")} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : "Valider l'agence"}
              </Button>
              <Button variant="destructive" onClick={() => setDialog("reject")} disabled={pending}>
                Rejeter
              </Button>
            </>
          )}
          {agency.verificationStatus === "VERIFIED" && (
            <Button variant="destructive" onClick={() => setDialog("suspend")} disabled={pending}>
              Suspendre
            </Button>
          )}
          {agency.verificationStatus === "SUSPENDED" && (
            <Button onClick={() => callAction("reactivate")} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Réactiver"}
            </Button>
          )}
        </div>
      </div>

      <Card className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2 text-sm">
          <FileText className="size-4 text-muted-foreground" />
          Justificatif fourni par l&apos;agence
        </div>
        {agency.proofDocUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={agency.proofDocUrl} target="_blank" rel="noreferrer">
              Télécharger le document
            </a>
          </Button>
        )}
      </Card>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-bold">Historique du statut</h2>
        {agency.statusHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun changement de statut enregistré.</p>
        ) : (
          <ol className="space-y-4 border-l pl-6">
            {agency.statusHistory.map((entry, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-6.5 size-2.5 rounded-full bg-primary" />
                <div className="flex items-center gap-2">
                  <StatusBadge kind="agency" status={entry.status} />
                  <span className="text-sm text-muted-foreground">{formatDate(entry.at)}</span>
                </div>
                {entry.reason && <p className="mt-1 text-sm text-muted-foreground">Raison : {entry.reason}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-bold">Voyages de cette agence ({trips.length})</h2>
        {trips.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun voyage publié pour le moment.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((t) => (
              <TripCard key={t.id} trip={t} showLifecycleStatus />
            ))}
          </div>
        )}
      </section>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && !pending && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "reject" ? "Rejeter l'agence" : "Suspendre l'agence"}</DialogTitle>
            <DialogDescription>
              {dialog === "reject"
                ? "Un email avec la raison du rejet sera envoyé à l'agence (E7)."
                : "L'agence ne pourra plus publier de nouveaux voyages tant qu'elle est suspendue, et ses voyages publiés seront fermés."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Raison *</Label>
            <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Retour
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || pending}
              onClick={() => callAction(dialog === "reject" ? "reject" : "suspend", { reason })}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
