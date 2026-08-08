import { defineRouting } from "next-intl/routing";

/**
 * The client-facing site is trilingual (FR/EN/AR) — agency/admin dashboards
 * and auth screens are deliberately out of scope and live outside the
 * `[locale]` segment entirely, so they're unaffected by any of this.
 *
 * `localePrefix: "always"` means every public URL, including French, carries
 * its locale (`/fr/voyages`, not a bare `/voyages`) — each language gets its
 * own indexable URL, which is what makes hreflang/sitemap alternates
 * meaningful instead of decorative.
 */
export const routing = defineRouting({
  locales: ["fr", "en", "ar"],
  defaultLocale: "fr",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

export const RTL_LOCALES: readonly Locale[] = ["ar"];

export function directionFor(locale: string): "rtl" | "ltr" {
  return (RTL_LOCALES as readonly string[]).includes(locale) ? "rtl" : "ltr";
}
