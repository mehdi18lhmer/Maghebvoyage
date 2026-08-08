import { routing } from "./routing";

/**
 * Builds the `alternates.languages` map Next expects for hreflang tags —
 * one entry per locale pointing at the same logical page, plus `x-default`
 * for crawlers/browsers that don't match any of the three explicitly.
 *
 * `pathname` is the locale-agnostic path (e.g. `/trip/my-slug`, `/voyages`),
 * matching what next-intl's own `usePathname()` returns.
 */
export function localeAlternates(pathname: string): Record<string, string> {
  const entries = routing.locales.map((locale) => [locale, `/${locale}${pathname}`] as const);
  return {
    ...Object.fromEntries(entries),
    "x-default": `/${routing.defaultLocale}${pathname}`,
  };
}
