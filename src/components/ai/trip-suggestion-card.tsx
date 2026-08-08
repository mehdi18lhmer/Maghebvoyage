"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateRange, formatPrice, seatsRemaining } from "@/lib/format";
import type { MatchReason } from "@/lib/ai-match";
import type { GroupTrip } from "@/lib/types";

/**
 * A trip recommendation rendered directly inside the chat, per the user's
 * explicit ask: suggestions must show "avec l'image de ces [voyages] et
 * explication", not just a text list. `reasons` are the same deterministic
 * match reasons shown on /demande/resultats — same trust, different surface,
 * and (via ai-match.ts's translator param) already in the active locale.
 */
export function TripSuggestionCard({
  trip,
  agencyName,
  reasons,
  matchPercent,
  onSelect,
}: {
  trip: GroupTrip;
  agencyName?: string;
  reasons?: MatchReason[];
  matchPercent?: number;
  onSelect: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("TripSuggestion");
  const tType = useTranslations("TripType");
  const remaining = seatsRemaining(trip.totalSpots, trip.bookedSpots);
  const soldOut = remaining <= 0;
  const cover = trip.images[0];

  return (
    <div className="w-60 shrink-0 overflow-hidden rounded-xl border bg-card shadow-tinted-sm">
      <div className="relative h-28 w-full bg-secondary">
        {cover ? (
          <Image src={cover} alt={trip.title} fill sizes="240px" className="object-cover" />
        ) : null}
        {typeof matchPercent === "number" && (
          <span className="absolute top-1.5 right-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground rtl:right-auto rtl:left-1.5">
            {matchPercent}%
          </span>
        )}
      </div>

      <div className="space-y-1.5 p-3">
        <p className="text-sm leading-snug font-semibold">{trip.title}</p>
        <p className="text-xs text-muted-foreground">
          {trip.destination} · {tType(trip.tripType)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDateRange(trip.startDate, trip.endDate, locale)}
        </p>
        {agencyName && (
          <p className="text-[11px] text-muted-foreground">{t("byAgency", { name: agencyName })}</p>
        )}

        {reasons && reasons.length > 0 && (
          <ul className="space-y-0.5 pt-1">
            {reasons.slice(0, 2).map((r) => (
              <li key={r.label} className="flex items-start gap-1 text-[11px] text-muted-foreground">
                <Check className="mt-0.5 size-3 shrink-0 text-success" />
                <span>{r.label}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-baseline gap-1.5 pt-1">
          <span className="text-sm font-bold">{formatPrice(trip.totalPrice, locale)}</span>
          <span className="text-[10px] text-muted-foreground">
            {t("depositIncluded", { amount: formatPrice(trip.depositAmount, locale) })}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {soldOut ? t("soldOut") : t("seatsLeft", { n: remaining })}
        </p>

        <Button size="sm" className="mt-1.5 w-full" onClick={onSelect} disabled={soldOut}>
          <Sparkles className="size-3.5" />
          {t("select")}
        </Button>
      </div>
    </div>
  );
}
