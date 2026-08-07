import { AdminReservationsView } from "@/components/admin/admin-reservations-view";
import { prisma } from "@/lib/prisma";
import { mapAgency, mapBooking, mapPayment, mapTrip } from "@/lib/db-mappers";

export default async function AdminReservationsPage() {
  const [bookingRows, tripRows, agencyRows, paymentRows] = await Promise.all([
    prisma.booking.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.groupTrip.findMany(),
    prisma.agency.findMany(),
    prisma.payment.findMany(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Gestion des réservations</h1>
        <p className="text-muted-foreground">Toutes les réservations, tous voyages et agences confondus.</p>
      </div>
      <AdminReservationsView
        bookings={bookingRows.map(mapBooking)}
        trips={tripRows.map(mapTrip)}
        agencies={agencyRows.map((a) => mapAgency(a))}
        payments={paymentRows.map(mapPayment)}
      />
    </div>
  );
}
