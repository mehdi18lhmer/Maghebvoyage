import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { isSoldOut, seatsRemaining } from "@/lib/format";

/**
 * Seat scarcity, styled as in the reference sheet: a coloured count over a
 * thin track. Green normally, amber under the CDC's 20% "presque complet"
 * threshold, red once full. Colours come from the status ramp in globals.css
 * so light and dark stay in step.
 */
export function SeatsGauge({
  totalSpots,
  bookedSpots,
  className,
}: {
  totalSpots: number;
  bookedSpots: number;
  className?: string;
}) {
  const t = useTranslations("SeatsGauge");
  const remaining = seatsRemaining(totalSpots, bookedSpots);
  const soldOut = isSoldOut(totalSpots, bookedSpots);
  const pct = Math.min((bookedSpots / totalSpots) * 100, 100);
  const nearlyFull = !soldOut && remaining / totalSpots < 0.2;

  return (
    <div className={cn("space-y-1.5", className)}>
      <p
        className={cn(
          "text-sm font-medium",
          soldOut ? "text-destructive" : nearlyFull ? "text-warning" : "text-success"
        )}
      >
        {soldOut ? t("soldOut") : t("remaining", { n: remaining, total: totalSpots })}
      </p>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            soldOut ? "bg-destructive" : nearlyFull ? "bg-warning" : "bg-success"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
