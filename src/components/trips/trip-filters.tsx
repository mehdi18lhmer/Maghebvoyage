"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/format";
import type { TripType } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface TripFiltersState {
  /** Country, matched against the owning agency's zones. "all" = no filter. */
  destination: string;
  month: string;
  budgetMax: number;
  types: TripType[];
}

const ALL_TYPES: TripType[] = [
  "DESERT",
  "TREKKING",
  "BEACH",
  "CULTURAL",
  "ADVENTURE",
  "CITY_BREAK",
  "GASTRONOMY",
  "PILGRIMAGE",
];

/** Shared look for every control in the bar — a rounded pill on the page surface. */
const PILL = "h-10 rounded-lg border bg-card px-3.5 text-sm font-medium shadow-tinted-sm";

export function TripFilters({
  state,
  onChange,
  destinations,
  destinationLabels,
  months,
  budgetCap,
}: {
  state: TripFiltersState;
  onChange: (next: TripFiltersState) => void;
  destinations: string[];
  /** Display label per canonical destination value (translated country name). */
  destinationLabels?: Record<string, string>;
  months: { value: string; label: string }[];
  budgetCap: number;
}) {
  const locale = useLocale();
  const t = useTranslations("TripFilters");
  const tType = useTranslations("TripType");
  const budgetActive = state.budgetMax < budgetCap;
  const typesActive = state.types.length > 0;

  function toggleType(type: TripType) {
    const has = state.types.includes(type);
    onChange({
      ...state,
      types: has ? state.types.filter((t) => t !== type) : [...state.types, type],
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="hidden items-center gap-2 pr-1 text-sm font-semibold sm:flex rtl:pr-0 rtl:pl-1">
        <SlidersHorizontal className="size-4" />
        {t("filters")}
      </span>

      <Select
        value={state.destination}
        onValueChange={(destination) => onChange({ ...state, destination })}
      >
        <SelectTrigger className={cn(PILL, "w-auto gap-2")} aria-label={t("destination")}>
          <SelectValue placeholder={t("destination")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allDestinations")}</SelectItem>
          {destinations.map((d) => (
            <SelectItem key={d} value={d}>
              {destinationLabels?.[d] ?? d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={state.month} onValueChange={(month) => onChange({ ...state, month })}>
        <SelectTrigger className={cn(PILL, "w-auto gap-2")} aria-label={t("departureMonth")}>
          <SelectValue placeholder={t("departureMonth")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allMonths")}</SelectItem>
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(PILL, "inline-flex items-center gap-2", budgetActive && "border-primary text-primary")}
          >
            {budgetActive ? t("upTo", { amount: formatPrice(state.budgetMax, locale) }) : t("budget")}
            <ChevronDown className="size-4 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("budgetMax")}</span>
              <span className="font-semibold">{formatPrice(state.budgetMax, locale)}</span>
            </div>
            <Slider
              value={[state.budgetMax]}
              max={budgetCap}
              min={100}
              step={10}
              onValueChange={([v]) => onChange({ ...state, budgetMax: v })}
            />
            {budgetActive && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => onChange({ ...state, budgetMax: budgetCap })}
              >
                {t("reset")}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(PILL, "inline-flex items-center gap-2", typesActive && "border-primary text-primary")}
          >
            {t("tripType")}
            {typesActive && (
              <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {state.types.length}
              </span>
            )}
            <ChevronDown className="size-4 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((type) => {
              const active = state.types.includes(type);
              return (
                <button key={type} type="button" onClick={() => toggleType(type)}>
                  <Badge
                    variant={active ? "default" : "outline"}
                    className={cn("cursor-pointer px-3 py-1", !active && "text-muted-foreground")}
                  >
                    {tType(type)}
                  </Badge>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {(typesActive || budgetActive || state.destination !== "all" || state.month !== "all") && (
        <Button
          variant="ghost"
          size="sm"
          className="h-10 gap-1.5 text-muted-foreground"
          onClick={() =>
            onChange({ destination: "all", month: "all", budgetMax: budgetCap, types: [] })
          }
        >
          <X className="size-3.5" />
          {t("clear")}
        </Button>
      )}
    </div>
  );
}
