import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthSessionProvider } from "@/components/providers/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  // Only ever painted in a handful of dashboard components (chart tick
  // labels, tokens) — never on the initial render of the public marketing
  // pages most visits land on. Preloading it there is exactly the "resource
  // was never requested during initial load" browser warning; `preload:
  // false` still lets it load normally the moment something needs it.
  preload: false,
});

// Headings only. The mockup pairs a slightly geometric display sans with a
// neutral grotesque for UI text — Fraunces (serif) was the old editorial
// direction and reads nothing like the reference sheet.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const SITE_NAME = "MaghrebVoyage";
const SITE_TITLE = "MaghrebVoyage — Voyages en groupe au Maroc, en Tunisie et en Algérie";
const SITE_DESCRIPTION =
  "Réservez des voyages en petit groupe auprès d'agences vérifiées au Maroc, en Tunisie et en Algérie, avec acompte sécurisé par carte.";

export const metadata: Metadata = {
  // Required for Next to resolve relative OG/Twitter image paths and
  // canonical URLs into absolute ones — without it, social previews silently
  // fall back to whatever origin the crawler happened to fetch from.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: [
    "voyage Maroc",
    "voyage Tunisie",
    "voyage Algérie",
    "voyage groupe Maghreb",
    "agence de voyage vérifiée",
    "trek désert Maroc",
    "circuit Maghreb diaspora",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  category: "travel",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

/**
 * Site-wide structured data (schema.org via JSON-LD) — Organization so search
 * engines can attribute pages to MaghrebVoyage as a brand entity, WebSite
 * with a SearchAction so Google can offer a sitelinks search box straight to
 * `/voyages`. Static, server-rendered data only — never user input — so
 * `dangerouslySetInnerHTML` here carries no injection risk.
 */
function siteJsonLd() {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TravelAgency",
        "@id": `${url}/#organization`,
        name: SITE_NAME,
        url,
        description: SITE_DESCRIPTION,
        areaServed: ["Maroc", "Tunisie", "Algérie"],
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name: SITE_NAME,
        publisher: { "@id": `${url}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${url}/voyages?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }}
        />
        <AuthSessionProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
