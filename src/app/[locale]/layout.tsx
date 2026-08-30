import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Validates the locale segment and enables static rendering for public pages.
 *
 * The root layout owns `<html>`/`<body>` and the single application-wide
 * `NextIntlClientProvider`, including for agency/admin routes that do not
 * carry a locale segment.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Enables static rendering for this locale's pages — without it, next-intl
  // falls back to dynamic rendering for anything under [locale].
  setRequestLocale(locale);

  return children;
}
