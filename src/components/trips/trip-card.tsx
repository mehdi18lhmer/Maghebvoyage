import Image from "next/image";
import Link from "next/link";
import type { GroupTrip } from "@/lib/types";
import { formatDateRange, formatPrice, isSoldOut, tripTypeLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { SeatsGauge } from "@/components/ui/seats-gauge";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

/** Ribbon shown on AI-recommendation results, ranked best-first. */
export type TripCardHighlight = "top" | "good" | "fallback";

const HIGHLIGHT: Record<TripCardHighlight, { label: string; className: string }> = {
  top: { label: "Recommandé", className: "bg-warning text-warning-foreground" },
  good: { label: "Parfait pour vous", className: "bg-success text-success-foreground" },
  fallback: { label: "Bonne option", className: "bg-info text-info-foreground" },
};

export function TripCard({
  trip,
  agencyName,
  showLifecycleStatus = false,
  highlight,
}: {
  trip: GroupTrip;
  agencyName?: string;
  /** Agency/admin contexts show DRAFT/CLOSED/etc.; public marketplace never does. */
  showLifecycleStatus?: boolean;
  highlight?: TripCardHighlight;
}) {
  const soldOut = isSoldOut(trip.totalSpots, trip.bookedSpots);
  const ribbon = highlight ? HIGHLIGHT[highlight] : null;

  return (
    <Link
      href={`/trip/${trip.slug}`}
      aria-disabled={soldOut || undefined}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-tinted-sm transition-all duration-300",
        soldOut ? "opacity-70" : "hover:-translate-y-1 hover:shadow-tinted-lg"
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <Image
          src={trip.images[0]}
          alt={trip.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className={cn(
            "object-cover transition-transform duration-500 ease-out",
            !soldOut && "group-hover:scale-[1.06]"
          )}
        />

        {ribbon && (
          <span
            className={cn(
              "absolute top-0 left-0 rounded-br-xl px-3 py-1.5 text-xs font-semibold",
              ribbon.className
            )}
          >
            {ribbon.label}
          </span>
        )}

        <div className={cn("absolute top-3 flex gap-1.5", ribbon ? "right-3" : "left-3")}>
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm">
            {tripTypeLabel(trip.tripType)}
          </Badge>
          {showLifecycleStatus && <StatusBadge kind="trip" status={trip.status} />}
        </div>

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-[oklch(0.16_0.022_266)]/55">
            <span className="rounded-full bg-card px-4 py-1.5 text-sm font-semibold">Complet</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="space-y-1">
          <h3 className="line-clamp-1 font-heading text-base font-bold">{trip.title}</h3>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {trip.destination} · {trip.durationDays} jours
          </p>
          <p className="text-sm text-muted-foreground">
            {formatDateRange(trip.startDate, trip.endDate)}
          </p>
        </div>

        {agencyName && <p className="text-xs text-muted-foreground">Par {agencyName}</p>}

        <div className="mt-auto space-y-3 pt-1">
          <div>
            <p className="font-heading text-2xl font-bold tabular-nums">
              {formatPrice(trip.totalPrice)}
            </p>
            <p className="text-xs text-muted-foreground">
              dont {formatPrice(trip.depositAmount)} d&apos;acompte
            </p>
          </div>
          <SeatsGauge totalSpots={trip.totalSpots} bookedSpots={trip.bookedSpots} />
        </div>
      </div>
    </Link>
  );
}
