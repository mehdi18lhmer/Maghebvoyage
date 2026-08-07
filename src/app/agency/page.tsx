import Link from "next/link";
import { Check, Circle, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { LastBookingsTable, UpcomingDeparturesTable } from "@/components/agency/home-tables";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mapBooking, mapTrip } from "@/lib/db-mappers";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/** §J.3's home metrics, computed the same way mock-data's getAgencyStats() modelled them. */
async function getAgencyStats(agencyId: string) {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [activeTrips, confirmedBookings, activeTripRows, departureRows, lastBookingRows, depositAgg] =
    await Promise.all([
      prisma.groupTrip.count({ where: { agencyId, status: { in: ["PUBLISHED", "FULL"] } } }),
      prisma.booking.count({ where: { agencyId, status: "CONFIRMED" } }),
      prisma.groupTrip.findMany({
        where: { agencyId, status: { in: ["PUBLISHED", "FULL"] } },
        select: { totalSpots: true, bookedSpots: true },
      }),
      prisma.groupTrip.findMany({
        where: {
          agencyId,
          status: { in: ["PUBLISHED", "FULL"] },
          startDate: { gte: now, lte: in30Days },
        },
        orderBy: { startDate: "asc" },
      }),
      prisma.booking.findMany({
        where: { agencyId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { groupTrip: { select: { title: true } } },
      }),
      prisma.payment.aggregate({
        where: { agencyId, status: "SUCCEEDED", paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
    ]);

  const seatsRemainingTotal = activeTripRows.reduce(
    (sum, t) => sum + Math.max(t.totalSpots - t.bookedSpots, 0),
    0
  );

  return {
    activeTrips,
    confirmedBookings,
    seatsRemainingTotal,
    depositsThisMonth: Number(depositAgg._sum.amount ?? 0),
    departuresWithin30Days: departureRows.map(mapTrip),
    lastBookings: lastBookingRows.map((b) => ({ ...mapBooking(b), tripTitle: b.groupTrip.title })),
  };
}

export default async function AgencyHomePage() {
  const session = await auth();
  const agencyId = session!.user.agencyId!;

  const [agency, stats] = await Promise.all([
    prisma.agency.findUniqueOrThrow({ where: { id: agencyId } }),
    getAgencyStats(agencyId),
  ]);

  const hasPublishedTrip = stats.activeTrips > 0;
  const hasBooking = stats.confirmedBookings > 0;

  const onboarding = [
    { label: "Compléter le profil de l'agence", done: true },
    { label: "Publier votre premier voyage", done: hasPublishedTrip },
    { label: "Partager le lien magique d'un voyage", done: hasPublishedTrip },
    { label: "Recevoir votre première réservation", done: hasBooking },
  ];
  const allDone = onboarding.every((s) => s.done);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            Bonjour {agency.managerName.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">Voici un aperçu de votre activité.</p>
        </div>
        <Button asChild>
          <Link href="/agency/voyages/new">
            <PlusCircle className="size-4" />
            Publier un voyage
          </Link>
        </Button>
      </div>

      {!allDone && (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold">Pour bien démarrer</p>
          <ul className="space-y-2.5">
            {onboarding.map((s) => (
              <li key={s.label} className="flex items-center gap-2.5 text-sm">
                {s.done ? (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success">
                    <Check className="size-3 text-success-foreground" strokeWidth={3} />
                  </span>
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                )}
                <span className={cn(s.done && "text-muted-foreground line-through")}>{s.label}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Voyages actifs" value={stats.activeTrips} />
        <KpiCard label="Réservations confirmées" value={stats.confirmedBookings} />
        <KpiCard label="Places restantes" value={stats.seatsRemainingTotal} />
        <KpiCard label="Acomptes reçus ce mois" value={formatPrice(stats.depositsThisMonth)} />
      </div>

      <LastBookingsTable bookings={stats.lastBookings} />
      <UpcomingDeparturesTable trips={stats.departuresWithin30Days} />
    </div>
  );
}
