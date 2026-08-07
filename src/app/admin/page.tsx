import Link from "next/link";
import { AlertTriangle, CreditCard, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { HomeBookingsTable } from "@/components/admin/home-bookings-table";
import { prisma } from "@/lib/prisma";
import { findAgenciesPendingOver48h } from "@/services/agency.service";
import { findStaleRefunds } from "@/services/bookings.service";
import { formatPrice } from "@/lib/format";

/** §K.1's home KPIs, computed directly against Postgres. */
async function getPlatformStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    pendingAgencies,
    verifiedAgencies,
    activeTrips,
    bookingsToday,
    bookingsThisMonth,
    depositAgg,
    lastBookingRows,
    cancelledTrips,
  ] = await Promise.all([
    prisma.agency.count({ where: { verificationStatus: { in: ["PENDING", "UNDER_REVIEW"] } } }),
    prisma.agency.count({ where: { verificationStatus: "VERIFIED" } }),
    prisma.groupTrip.count({ where: { status: { in: ["PUBLISHED", "FULL"] } } }),
    prisma.booking.count({ where: { status: "CONFIRMED", createdAt: { gte: todayStart } } }),
    prisma.booking.count({ where: { status: "CONFIRMED", createdAt: { gte: monthStart } } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED", paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { groupTrip: { select: { title: true } } },
    }),
    // §K.1 "voyages annulés" alert — recent agency-initiated cancellations.
    prisma.groupTrip.findMany({
      where: { status: "CANCELLED", cancelledAt: { gte: new Date(now.getTime() - 14 * 86_400_000) } },
      orderBy: { cancelledAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    pendingAgencies,
    verifiedAgencies,
    activeTrips,
    bookingsToday,
    bookingsThisMonth,
    depositsThisMonth: Number(depositAgg._sum.amount ?? 0),
    lastBookings: lastBookingRows.map((b) => ({
      id: b.id,
      groupTripId: b.groupTripId,
      clientName: b.clientName,
      clientEmail: b.clientEmail,
      clientPhone: b.clientPhone ?? "",
      numberOfSeats: b.numberOfSeats,
      status: b.status,
      cancellationToken: b.cancellationToken,
      confirmationCode: b.confirmationCode ?? undefined,
      createdAt: b.createdAt.toISOString(),
      tripTitle: b.groupTrip.title,
    })),
    cancelledTrips,
  };
}

export default async function AdminHomePage() {
  const [stats, staleAgencies, staleRefunds] = await Promise.all([
    getPlatformStats(),
    findAgenciesPendingOver48h(),
    findStaleRefunds(),
  ]);

  const hasAlerts = staleAgencies.length > 0 || stats.cancelledTrips.length > 0 || staleRefunds.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">
          Tableau de bord administrateur
        </h1>
        <p className="mt-1 text-muted-foreground">Vue d&apos;ensemble de la plateforme MaghrebVoyage.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Agences en attente" value={stats.pendingAgencies} tone="warning" />
        <KpiCard label="Agences vérifiées" value={stats.verifiedAgencies} />
        <KpiCard label="Voyages actifs" value={stats.activeTrips} />
        <KpiCard label="Réservations aujourd'hui" value={stats.bookingsToday} />
        <KpiCard label="Réservations ce mois" value={stats.bookingsThisMonth} />
        <KpiCard label="Acomptes ce mois" value={formatPrice(stats.depositsThisMonth)} />
      </div>

      {hasAlerts && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
            <AlertTriangle className="size-5 text-warning" />
            Alertes
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {staleAgencies.length > 0 && (
              <Card className="gap-2 border-warning/30 p-4">
                <p className="text-sm font-semibold text-warning">
                  {staleAgencies.length} agence{staleAgencies.length > 1 ? "s" : ""} en attente depuis plus
                  de 48h
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {staleAgencies.map((a) => (
                    <li key={a.id}>
                      <Link href={`/admin/agences/${a.id}`} className="text-primary hover:underline">
                        {a.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {stats.cancelledTrips.length > 0 && (
              <Card className="gap-2 border-destructive/30 p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                  <XCircle className="size-4" />
                  {stats.cancelledTrips.length} voyage{stats.cancelledTrips.length > 1 ? "s" : ""} annulé
                  {stats.cancelledTrips.length > 1 ? "s" : ""} récemment
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {stats.cancelledTrips.map((t) => (
                    <li key={t.id}>{t.title}</li>
                  ))}
                </ul>
              </Card>
            )}
            {staleRefunds.length > 0 && (
              <Card className="gap-2 border-destructive/30 p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                  <CreditCard className="size-4" />
                  {staleRefunds.length} remboursement{staleRefunds.length > 1 ? "s" : ""} en attente
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {staleRefunds.map((b) => (
                    <li key={b.id}>
                      {b.clientName} — {b.confirmationCode ?? b.id.slice(0, 8)}
                    </li>
                  ))}
                </ul>
                <Link href="/admin/reservations" className="text-sm font-medium text-primary hover:underline">
                  Voir dans Gestion réservations
                </Link>
              </Card>
            )}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-bold">Dernières réservations</h2>
        <HomeBookingsTable bookings={stats.lastBookings} />
      </section>
    </div>
  );
}
