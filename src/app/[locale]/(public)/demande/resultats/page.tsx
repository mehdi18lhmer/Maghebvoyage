"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, SearchX, Sparkles, TriangleAlert, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TripCard } from "@/components/trips/trip-card";
import { highlightForRank, type ScoredMatch } from "@/lib/ai-match";
import type { GroupTrip } from "@/lib/types";

const RESULT_KEY = "mv_ai_form_result";

interface StoredResult {
  trips: GroupTrip[];
  fallback: boolean;
  scored?: ScoredMatch[];
  agencyNames?: Record<string, string>;
}

export default function AiResultsPage() {
  const [matched, setMatched] = useState<GroupTrip[] | null>(null);
  const [fallback, setFallback] = useState(false);
  const [scored, setScored] = useState<ScoredMatch[]>([]);
  const [agencyNames, setAgencyNames] = useState<Record<string, string>>({});

  // Results live in localStorage (written by the form on submit, already the
  // real matched trips returned from POST /api/ai/match), not in a URL or a
  // fresh server call, so reading them can only happen post-mount — the
  // one-render delay is the trade-off, same as the form's own draft restore.
  useEffect(() => {
    const raw = window.localStorage.getItem(RESULT_KEY);
    if (!raw) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMatched([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as StoredResult;
      setMatched(parsed.trips);
      setFallback(parsed.fallback);
      setScored(parsed.scored ?? []);
      setAgencyNames(parsed.agencyNames ?? {});
    } catch {
      setMatched([]);
    }
  }, []);

  // Avoids a hydration flash of the empty state before localStorage is read.
  if (matched === null) {
    return null;
  }

  if (matched.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
          <SearchX className="size-6 text-muted-foreground" />
        </span>
        <h1 className="mt-4 font-heading text-2xl font-bold">Aucune recherche en cours</h1>
        <p className="mt-2 text-muted-foreground">
          Remplissez le formulaire pour recevoir des suggestions de voyages.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/demande">Trouver mon voyage</Link>
        </Button>
      </div>
    );
  }

  const byId = new Map(scored.map((s) => [s.tripId, s]));
  const best = matched[0];
  const bestScore = byId.get(best.id);
  const rest = matched.slice(1);

  return (
    <div className="bg-secondary/40 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Link
          href="/demande"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour
        </Link>

        <div className="mt-4 mb-10 space-y-2 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-primary shadow-tinted-sm">
            <Sparkles className="size-3.5" />
            {fallback ? "Prochains départs disponibles" : "Sélection personnalisée"}
          </span>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight">
            {fallback ? "Voici les prochains voyages disponibles" : "Voici nos recommandations pour vous"}
          </h1>
          <p className="text-muted-foreground">
            {fallback
              ? "Nous n’avons pas trouvé de correspondance exacte à vos critères — voici les départs les plus proches, basés sur la disponibilité actuelle."
              : "Classées selon ce que vous nous avez dit. Chaque voyage explique pourquoi il vous correspond."}
          </p>
        </div>

        {/* Top pick, given room to justify itself */}
        {!fallback && bestScore ? (
          <div className="mb-8 grid gap-6 rounded-2xl border bg-card p-5 shadow-tinted-sm lg:grid-cols-2 lg:p-6">
            <TripCard trip={best} agencyName={agencyNames[best.agencyId]} highlight="top" />

            <div className="flex flex-col justify-center">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-warning-muted px-2.5 py-1 text-xs font-semibold text-warning">
                <Trophy className="size-3.5" />
                Notre meilleure recommandation
              </span>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-heading text-4xl font-extrabold tabular-nums text-primary">
                  {bestScore.matchPercent}%
                </span>
                <span className="text-sm text-muted-foreground">de correspondance</span>
              </div>

              <div
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={bestScore.matchPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Taux de correspondance"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${bestScore.matchPercent}%` }}
                />
              </div>

              <p className="mt-5 text-sm font-semibold">Pourquoi ce voyage vous correspond</p>
              <ul className="mt-2 space-y-2">
                {bestScore.reasons.map((r) => (
                  <li key={r.label} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>{r.label}</span>
                  </li>
                ))}
              </ul>

              {bestScore.warnings.length > 0 && (
                <>
                  <p className="mt-5 text-sm font-semibold">À savoir</p>
                  <ul className="mt-2 space-y-2">
                    {bestScore.warnings.map((w) => (
                      <li key={w} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <Button className="mt-6 w-fit" asChild>
                <Link href={`/trip/${best.slug}`}>Voir ce voyage</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {/* Remaining suggestions */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(fallback ? matched : rest).map((trip, i) => {
            const s = byId.get(trip.id);
            return (
              <div key={trip.id} className="flex flex-col gap-3">
                <TripCard
                  trip={trip}
                  agencyName={agencyNames[trip.agencyId]}
                  // rest[] starts at rank 1, so shift the ribbon index back.
                  highlight={fallback ? undefined : highlightForRank(i + 1)}
                />
                {s && s.reasons.length > 0 && (
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">Pourquoi ce voyage</p>
                      <span className="text-xs font-bold tabular-nums text-primary">
                        {s.matchPercent}%
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {s.reasons.slice(0, 3).map((r) => (
                        <li
                          key={r.label}
                          className="flex items-start gap-1.5 text-xs text-muted-foreground"
                        >
                          <Check className="mt-0.5 size-3 shrink-0 text-success" />
                          <span>{r.label}</span>
                        </li>
                      ))}
                      {s.warnings.slice(0, 2).map((w) => (
                        <li key={w} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <TriangleAlert className="mt-0.5 size-3 shrink-0 text-warning" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">Ces voyages vous intéressent ?</p>
          <Button variant="outline" asChild>
            <Link href="/voyages">Voir tous les voyages disponibles</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
