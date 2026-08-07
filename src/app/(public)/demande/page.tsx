import type { Metadata } from "next";
import { AiPlannerClient } from "@/components/ai/ai-planner-client";

export const metadata: Metadata = { title: "Trouver mon voyage | MaghrebVoyage" };

export default function AiRequestPage() {
  return (
    <div className="bg-secondary/40 py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AiPlannerClient />
      </div>
    </div>
  );
}
