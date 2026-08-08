import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Wraps every client-facing page in the trilingual message provider.
 *
 * Deliberately doesn't redeclare `<html>`/`<body>` — the root layout
 * (`src/app/layout.tsx`) owns those for the whole app, including the
 * agency/admin/auth routes that live outside this segment and stay
 * French/LTR. This layout's only job is making translations available to
 * every "use client" component nested under it.
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

  return <NextIntlClientProvider>{children}</NextIntlClientProvider>;
}
