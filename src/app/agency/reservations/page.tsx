import { Suspense } from "react";
import { AgencyReservationsView } from "@/components/agency/agency-reservations-view";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mapBooking, mapPayment, mapTrip } from "@/lib/db-mappers";

async function ReservationsWithFilter({ searchParams }: PageProps<"/agency/reservations">) {
  const params = await searchParams;
  const initialTripId = typeof params.trip === "string" ? params.trip : undefined;

  const session = await auth();
  const agencyId = session!.user.agencyId!;

  const [bookingRows, tripRows, paymentRows] = await Promise.all([
    prisma.booking.findMany({ where: { agencyId }, orderBy: { createdAt: "desc" } }),
    prisma.groupTrip.findMany({ where: { agencyId } }),
    // Scoped to this agency's own payments — CDC §4's isolation rule applies
    // to every agency-facing query, payments included.
    prisma.payment.findMany({ where: { agencyId } }),
  ]);

  return (
    <AgencyReservationsView
      bookings={bookingRows.map(mapBooking)}
      trips={tripRows.map(mapTrip)}
      payments={paymentRows.map(mapPayment)}
      initialTripId={initialTripId}
    />
  );
}

export default function AgencyReservationsPage(props: PageProps<"/agency/reservations">) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Mes réservations</h1>
        <p className="text-muted-foreground">Toutes les réservations reçues sur vos voyages.</p>
      </div>
      <Suspense>
        <ReservationsWithFilter {...props} />
      </Suspense>
    </div>
  );
}
