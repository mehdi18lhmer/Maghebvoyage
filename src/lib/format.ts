/**
 * `locale` is optional and defaults to French everywhere — the agency/admin
 * dashboards (out of i18n scope, see CLAUDE.md's language decisions) call
 * these with no locale and keep formatting in French exactly as before.
 * Public-facing [locale]-scoped pages pass the active locale explicitly.
 */
const INTL_LOCALE: Record<string, string> = {
  fr: "fr-FR",
  en: "en-GB",
  ar: "ar",
};

function intlLocale(locale: string) {
  return INTL_LOCALE[locale] ?? "fr-FR";
}

export function formatPrice(amount: number, locale = "fr") {
  return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "EUR" }).format(
    amount
  );
}

export function formatDate(iso: string, locale = "fr") {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateShort(iso: string, locale = "fr") {
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short" }).format(
    new Date(iso)
  );
}

export function formatDateRange(startIso: string, endIso: string, locale = "fr") {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startFmt = new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: sameMonth ? undefined : "long",
  }).format(start);
  const endFmt = new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(end);
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

/**
 * French-only fallback, used by the out-of-scope agency/admin dashboards.
 * Public-facing pages should use the `TripType` message namespace via
 * `useTranslations("TripType")` instead, so the label actually follows the
 * active locale.
 */
export function tripTypeLabel(type: string) {
  return TRIP_TYPE_LABELS[type] ?? type;
}
