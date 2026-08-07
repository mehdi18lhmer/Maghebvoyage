import { AdminPaymentsView } from "@/components/admin/admin-payments-view";
import { prisma } from "@/lib/prisma";
import { mapAgency, mapBooking, mapPayment, mapTrip } from "@/lib/db-mappers";

export default async function AdminPaymentsPage() {
  const [paymentRows, bookingRows, tripRows, agencyRows] = await Promise.all([
    prisma.payment.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.booking.findMany(),
    prisma.groupTrip.findMany(),
    prisma.agency.findMany(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Gestion des paiements</h1>
        <p className="text-muted-foreground">Suivi des acomptes encaissés via Stripe.</p>
      </div>
      <AdminPaymentsView
        payments={paymentRows.map(mapPayment)}
        bookings={bookingRows.map(mapBooking)}
        trips={tripRows.map(mapTrip)}
        agencies={agencyRows.map((a) => mapAgency(a))}
      />
    </div>
  );
}
