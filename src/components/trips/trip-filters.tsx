"use client";

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
import { formatPrice, tripTypeLabel } from "@/lib/format";
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
  months,
  budgetCap,
}: {
  state: TripFiltersState;
  onChange: (next: TripFiltersState) => void;
  destinations: string[];
  months: { value: string; label: string }[];
  budgetCap: number;
}) {
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
      <span className="hidden items-center gap-2 pr-1 text-sm font-semibold sm:flex">
        <SlidersHorizontal className="size-4" />
        Filtres
      </span>

      <Select
        value={state.destination}
        onValueChange={(destination) => onChange({ ...state, destination })}
      >
        <SelectTrigger className={cn(PILL, "w-auto gap-2")} aria-label="Destination">
          <SelectValue placeholder="Destination" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes destinations</SelectItem>
          {destinations.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={state.month} onValueChange={(month) => onChange({ ...state, month })}>
        <SelectTrigger className={cn(PILL, "w-auto gap-2")} aria-label="Mois de départ">
          <SelectValue placeholder="Mois de départ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les mois</SelectItem>
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
            {budgetActive ? `Jusqu'à ${formatPrice(state.budgetMax)}` : "Budget"}
            <ChevronDown className="size-4 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Budget max</span>
              <span className="font-semibold">{formatPrice(state.budgetMax)}</span>
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
                Réinitialiser
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
            Type de voyage
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
                    {tripTypeLabel(type)}
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
          Effacer
        </Button>
      )}
    </div>
  );
}
