export function formatPrice(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso)
  );
}

export function formatDateShort(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(iso));
}

export function formatDateRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startFmt = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: sameMonth ? undefined : "long",
  }).format(start);
  const endFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(end);
  return `${startFmt} – ${endFmt}`;
}

export function seatsRemaining(totalSpots: number, bookedSpots: number) {
  return Math.max(totalSpots - bookedSpots, 0);
}

export function isSoldOut(totalSpots: number, bookedSpots: number) {
  return bookedSpots >= totalSpots;
}

export function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const TRIP_TYPE_LABELS: Record<string, string> = {
  CULTURAL: "Culturel",
  DESERT: "Désert",
  BEACH: "Plage",
  ADVENTURE: "Aventure",
  PILGRIMAGE: "Pèlerinage",
  CITY_BREAK: "Escapade urbaine",
  TREKKING: "Trekking",
  GASTRONOMY: "Gastronomie",
};

export function tripTypeLabel(type: string) {
  return TRIP_TYPE_LABELS[type] ?? type;
}
