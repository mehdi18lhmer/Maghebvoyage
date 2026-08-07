"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { TripCard } from "@/components/trips/trip-card";
import { TripFilters, type TripFiltersState } from "@/components/trips/trip-filters";
import { getAgencyById, getAgencyName, getAllAgencies, getPublicTrips } from "@/lib/mock-data";
import type { GroupTrip, TripType } from "@/lib/types";

const PAGE_SIZE = 12;

type SortKey = "date-asc" | "price-asc" | "price-desc" | "seats-asc";

const SORTERS: Record<SortKey, (a: GroupTrip, b: GroupTrip) => number> = {
  "date-asc": (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  "price-asc": (a, b) => a.totalPrice - b.totalPrice,
  "price-desc": (a, b) => b.totalPrice - a.totalPrice,
  "seats-asc": (a, b) => a.totalSpots - a.bookedSpots - (b.totalSpots - b.bookedSpots),
};

function monthOptions(trips: GroupTrip[]) {
  const seen = new Map<string, string>();
  for (const trip of trips) {
    const d = new Date(trip.startDate);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!seen.has(value)) {
      seen.set(value, new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d));
    }
  }
  return [...seen.entries()].map(([value, label]) => ({ value, label }));
}

/** A trip's country is the zone of the agency that owns it. */
function tripCountry(trip: GroupTrip): string | undefined {
  return getAgencyById(trip.agencyId)?.zones[0];
}

export function MarketplaceBrowser() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") as TripType | null;
  const initialDestination = searchParams.get("destination");

  const allTrips = useMemo(() => getPublicTrips(), []);
  const destinations = useMemo(
    () => [...new Set(getAllAgencies().flatMap((a) => a.zones))].sort(),
    []
  );
  const budgetCap = Math.max(...allTrips.map((t) => t.totalPrice)) + 50;

  const [filters, setFilters] = useState<TripFiltersState>({
    destination: initialDestination ?? "all",
    month: "all",
    budgetMax: budgetCap,
    types: initialType ? [initialType] : [],
  });
  const [sort, setSort] = useState<SortKey>("date-asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return allTrips
      .filter((t) => {
        const matchesDestination =
          filters.destination === "all" || tripCountry(t) === filters.destination;
        const matchesMonth =
          filters.month === "all" ||
          (() => {
            const d = new Date(t.startDate);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === filters.month;
          })();
        const matchesBudget = t.totalPrice <= filters.budgetMax;
        const matchesType = filters.types.length === 0 || filters.types.includes(t.tripType);
        return matchesDestination && matchesMonth && matchesBudget && matchesType;
      })
      .sort(SORTERS[sort]);
  }, [allTrips, filters, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Filter bar — controls left, sort pinned right, as in the reference sheet */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TripFilters
          state={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
          destinations={destinations}
          months={monthOptions(allTrips)}
          budgetCap={budgetCap}
        />

        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">Trier par</span>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-10 w-auto gap-2 rounded-lg border bg-card px-3.5 text-sm font-medium shadow-tinted-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-asc">Date de départ</SelectItem>
              <SelectItem value="price-asc">Prix croissant</SelectItem>
              <SelectItem value="price-desc">Prix décroissant</SelectItem>
              <SelectItem value="seats-asc">Places restantes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} voyage{filtered.length > 1 ? "s" : ""} disponible
        {filtered.length > 1 ? "s" : ""}
      </p>

      {pageItems.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed bg-card py-24 text-center">
          <p className="text-muted-foreground">
            Aucun voyage ne correspond à ces critères. Essayez d&apos;élargir votre budget ou vos
            dates.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((trip) => (
            <TripCard key={trip.id} trip={trip} agencyName={getAgencyName(trip.agencyId)} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.max(1, p - 1));
                }}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  isActive={p === currentPage}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(p);
                  }}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.min(totalPages, p + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
