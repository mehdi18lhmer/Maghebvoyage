import type { Metadata } from "next";
import { AiPlannerClient } from "@/components/ai/ai-planner-client";

const DESCRIPTION =
  "Décrivez votre voyage idéal au Maroc, en Tunisie ou en Algérie — notre assistant IA trouve les meilleurs départs parmi les voyages réellement disponibles.";

export const metadata: Metadata = {
  title: "Trouver mon voyage",
  description: DESCRIPTION,
  alternates: { canonical: "/demande" },
  openGraph: { title: "Trouver mon voyage | MaghrebVoyage", description: DESCRIPTION, url: "/demande" },
};

export default function AiRequestPage() {
  return (
    <div className="bg-secondary/40 py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AiPlannerClient />
      </div>
    </div>
  );
}
