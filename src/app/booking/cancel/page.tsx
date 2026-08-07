import Link from "next/link";
import type { Metadata } from "next";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CancelBookingFlow } from "@/components/bookings/cancel-booking-flow";
import { getBookingByToken, getTripBySlug, trips } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Annuler ma réservation | MaghrebVoyage",
  robots: { index: false },
};

export default async function BookingCancelPage({ searchParams }: PageProps<"/booking/cancel">) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;
  const booking = token ? getBookingByToken(token) : undefined;
  const trip = booking ? trips.find((t) => t.id === booking.groupTripId) : undefined;

  // Checking status before honouring the token is what makes it effectively
  // single-use (CDC §10) — a replayed link on an already-cancelled booking
  // must not re-run the cancellation.
  if (!booking || !trip || booking.status === "CANCELLED") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 sm:px-6">
        <Card className="gap-0 p-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
            <Ban className="size-6 text-muted-foreground" />
          </span>
          <h1 className="mt-4 font-heading text-xl font-bold">
            {booking?.status === "CANCELLED" ? "Réservation déjà annulée" : "Lien invalide ou expiré"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {booking?.status === "CANCELLED"
              ? "Cette réservation a déjà été annulée précédemment — ce lien ne peut pas être réutilisé."
              : "Vérifiez le lien reçu dans votre email de confirmation."}
          </p>
          <Button className="mt-6" asChild>
            <Link href="/voyages">Voir les voyages</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <CancelBookingFlow booking={booking} trip={getTripBySlug(trip.slug)!} />
    </div>
  );
}
