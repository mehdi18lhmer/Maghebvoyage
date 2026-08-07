import Link from "next/link";
import { Mail } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";

const LEGAL_LINKS = [
  { href: "/legal/cgu", label: "CGU" },
  { href: "/legal/confidentialite", label: "Confidentialité" },
  { href: "/legal/remboursements", label: "Remboursements" },
  { href: "/legal/mentions", label: "Mentions légales" },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="space-y-3 md:col-span-2">
          <Link href="/" className="flex items-center gap-2 font-heading font-bold">
            <BrandMark className="text-primary" />
            MaghrebVoyage
          </Link>
          <p className="max-w-sm text-sm text-muted-foreground">
            La marketplace des voyages en petit groupe organisés par des agences vérifiées au Maroc, en Tunisie et en
            Algérie — pensée pour la diaspora.
          </p>
          <a
            href="mailto:contact@maghrebvoyage.com"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Mail className="size-3.5" />
            contact@maghrebvoyage.com
          </a>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Voyager</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/voyages" className="hover:text-foreground">
                Toutes les destinations
              </Link>
            </li>
            <li>
              <Link href="/demande" className="hover:text-foreground">
                Trouver mon voyage (IA)
              </Link>
            </li>
            <li>
              <Link href="/register/agency" className="hover:text-foreground">
                Publier en tant qu&apos;agence
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Légal</p>
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
        © {new Date().getFullYear()} MaghrebVoyage. Tous droits réservés.
      </div>
    </footer>
  );
}
