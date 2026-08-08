import NextLink from "next/link";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/layout/brand-mark";

/**
 * `/register/agency` uses plain next/link — it lives outside the `[locale]`
 * segment (see the note in site-header.tsx), everything else is locale-aware.
 */
export function SiteFooter() {
  const t = useTranslations("Footer");
  const nav = useTranslations("Nav");

  const LEGAL_LINKS = [
    { href: "/legal/cgu", label: t("legal.cgu") },
    { href: "/legal/confidentialite", label: t("legal.confidentialite") },
    { href: "/legal/remboursements", label: t("legal.remboursements") },
    { href: "/legal/mentions", label: t("legal.mentions") },
  ];

  return (
    <footer className="border-t bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="space-y-3 md:col-span-2">
          <Link href="/" className="flex items-center gap-2 font-heading font-bold">
            <BrandMark className="text-primary" />
            {nav("brand")}
          </Link>
          <p className="max-w-sm text-sm text-muted-foreground">{t("tagline")}</p>
          <a
            href="mailto:contact@maghrebvoyage.com"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Mail className="size-3.5" />
            contact@maghrebvoyage.com
          </a>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">{t("travelHeading")}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/voyages" className="hover:text-foreground">
                {t("allDestinations")}
              </Link>
            </li>
            <li>
              <Link href="/demande" className="hover:text-foreground">
                {t("findTripAi")}
              </Link>
            </li>
            <li>
              <NextLink href="/register/agency" className="hover:text-foreground">
                {t("publishAsAgency")}
              </NextLink>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">{t("legalHeading")}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
        {t("copyright", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
