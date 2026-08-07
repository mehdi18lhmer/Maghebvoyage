import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

const LEGAL_NAV = [
  { href: "/legal/cgu", label: "CGU" },
  { href: "/legal/confidentialite", label: "Confidentialité" },
  { href: "/legal/remboursements", label: "Remboursements" },
  { href: "/legal/mentions", label: "Mentions légales" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <nav className="mb-10 flex flex-wrap gap-2 border-b pb-6">
            {LEGAL_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <article className="prose prose-neutral max-w-none dark:prose-invert">{children}</article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
