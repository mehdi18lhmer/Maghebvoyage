"use client";

import { Sparkles } from "lucide-react";
import { AssistantPanel } from "@/components/ai/assistant-panel";
import { TripRecapPanel } from "@/components/ai/trip-recap-panel";
import { useAiFormState } from "@/components/ai/use-ai-form-state";

/**
 * Split out of the page so the page itself can stay a Server Component and
 * keep exporting `metadata` — App Router forbids that export from a file
 * marked "use client", which this one has to be.
 *
 * Layout: the assistant is the primary column and the questionnaire is a live
 * récapitulatif beside it. Both read and write the same `formState`, so
 * speaking, typing and editing all land in one object.
 */
export function AiPlannerClient() {
  const formState = useAiFormState();

  return (
    <>
      <div className="mb-10 space-y-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-primary shadow-tinted-sm">
          <Sparkles className="size-3.5" />
          Assistant IA
        </span>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">
          Trouvons votre voyage idéal
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Parlez ou écrivez à l&apos;assistant — il remplit votre demande pour vous et vous propose
          1 à 3 voyages déjà publiés par nos agences vérifiées.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <AssistantPanel formState={formState} />
        </div>
        <div className="lg:col-span-2 lg:sticky lg:top-24">
          <TripRecapPanel {...formState} />
        </div>
      </div>
    </>
  );
}
