import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * Resolves the active locale + message catalogue for every server render.
 *
 * Also the fallback path for routes that live OUTSIDE the `[locale]` segment
 * entirely (agency/admin dashboards, /login, /register) — those never match
 * a locale param, so `requestLocale` comes back empty and this falls back to
 * `defaultLocale` ("fr"). That's what lets the root layout call
 * `getLocale()` unconditionally without caring whether the current route is
 * localized at all.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && routing.locales.includes(requested as (typeof routing.locales)[number])
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
