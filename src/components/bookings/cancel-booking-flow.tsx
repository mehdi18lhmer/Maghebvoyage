"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Booking, GroupTrip } from "@/lib/types";
import { formatDateRange, formatPrice } from "@/lib/format";

export function CancelBookingFlow({ booking, trip }: { booking: Booking; trip: GroupTrip }) {
  const [step, setStep] = useState<"confirm" | "loading" | "done">("confirm");
  const depositPaid = trip.depositAmount * booking.numberOfSeats;

  if (step === "done") {
    return (
      <Card className="gap-0 p-8 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success">
          <Check className="size-8 text-success-foreground" strokeWidth={3} />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-extrabold tracking-tight">
          Réservation annulée
        </h1>
        <p className="mt-2 text-muted-foreground">
          Votre place sur <strong className="text-foreground">{trip.title}</strong> a bien été
          libérée. Un email de confirmation vous a été envoyé.
        </p>
        <div className="mt-6 rounded-xl bg-muted p-4 text-left text-sm text-muted-foreground">
          Le remboursement de votre acompte de{" "}
          <strong className="text-foreground">{formatPrice(depositPaid)}</strong> est traité
          manuellement par notre équipe. Vous recevrez un second email dès qu&apos;il est effectué.
        </div>
        <Button className="mt-6" asChild>
          <Link href="/voyages">Voir d&apos;autres voyages</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="gap-0 p-6 sm:p-8">
      <h1 className="font-heading text-2xl font-extrabold tracking-tight">
        Annuler votre réservation ?
      </h1>
      <p className="mt-2 text-muted-foreground">
        Vérifiez les détails ci-dessous avant de confirmer.
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-muted p-4">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
        <p className="text-sm">
          Cette action est définitive et votre place sera immédiatement remise en vente. Le
          remboursement de votre acompte est traité manuellement par notre équipe, pas
          automatiquement.
        </p>
      </div>

      <Separator className="my-6" />

      <div>
        <p className="font-heading text-lg font-bold">{trip.title}</p>
        <p className="text-sm text-muted-foreground">{trip.destination}</p>
      </div>

      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Dates</dt>
          <dd className="font-medium">{formatDateRange(trip.startDate, trip.endDate)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Places réservées</dt>
          <dd className="font-medium">
            {booking.numberOfSeats} place{booking.numberOfSeats > 1 ? "s" : ""}
          </dd>
        </div>
        {booking.confirmationCode && (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Code de confirmation</dt>
            <dd className="font-mono font-medium">{booking.confirmationCode}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Acompte à rembourser</dt>
          <dd className="font-semibold tabular-nums">{formatPrice(depositPaid)}</dd>
        </div>
      </dl>

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
        <Button variant="outline" className="flex-1" asChild>
          <Link href={`/trip/${trip.slug}`}>Garder ma réservation</Link>
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          disabled={step === "loading"}
          onClick={async () => {
            setStep("loading");
            // Real flow: POST /api/bookings/cancel?token=… — the endpoint is the
            // only path allowed to decrement GroupTrip.bookedSpots.
            await new Promise((r) => setTimeout(r, 800));
            setStep("done");
          }}
        >
          {step === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Annulation…
            </>
          ) : (
            "Confirmer l'annulation"
          )}
        </Button>
      </div>
    </Card>
  );
}
