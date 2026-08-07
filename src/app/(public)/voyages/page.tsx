import { Suspense } from "react";
import type { Metadata } from "next";
import { MarketplaceBrowser } from "@/components/trips/marketplace-browser";

export const metadata: Metadata = {
  title: "Tous les voyages | MaghrebVoyage",
};

export default function MarketplacePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Tous les voyages</h1>
        <p className="text-muted-foreground">
          Voyages en groupe publiés par des agences vérifiées au Maroc, en Tunisie et en Algérie.
        </p>
      </div>
      <Suspense>
        <MarketplaceBrowser />
      </Suspense>
    </div>
  );
}
