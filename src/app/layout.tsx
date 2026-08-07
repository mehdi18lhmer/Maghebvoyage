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
});

// Headings only. The mockup pairs a slightly geometric display sans with a
// neutral grotesque for UI text — Fraunces (serif) was the old editorial
// direction and reads nothing like the reference sheet.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "MaghrebVoyage — Voyages en groupe au Maroc, en Tunisie et en Algérie",
  description:
    "Réservez des voyages en petit groupe auprès d'agences vérifiées au Maroc, en Tunisie et en Algérie, avec acompte sécurisé par carte.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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
