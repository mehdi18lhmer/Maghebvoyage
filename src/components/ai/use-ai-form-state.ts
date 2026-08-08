"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { EMPTY_AI_FORM, missingRequiredFields, type AiFormData, type MatchResult } from "@/lib/ai-match";
import type { TripType } from "@/lib/types";

const DRAFT_KEY = "mv_ai_form_draft";
const RESULT_KEY = "mv_ai_form_result";

/**
 * All state and behaviour for the 5-step planner, extracted out of the wizard
 * component so it can be called once in the page and shared with the
 * assistant panel — talking and clicking both edit the same `form`, live.
 *
 * Previously this lived entirely inside AiRequestForm. Nothing about the
 * wizard's own behaviour (localStorage draft, per-step validation, matching
 * on submit) changed — only that it's now reachable from outside.
 */
export function useAiFormState() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("AiPlanner.errors");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<AiFormData>(EMPTY_AI_FORM);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        // Deferred to post-mount, not a lazy useState initializer: the server
        // render has no localStorage, so hydrating from it in the initializer
        // would mismatch the SSR'd markup.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm({ ...EMPTY_AI_FORM, ...JSON.parse(saved) });
      } catch {
        // corrupted draft — ignore, start fresh
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form, hydrated]);

  const update = useCallback(<K extends keyof AiFormData>(key: K, value: AiFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  /**
   * Merges fields extracted from conversation into the form. Only overwrites
   * the keys actually present in `partial` — a turn that only mentions a
   * budget must never blank out a destination given three turns earlier.
   */
  const applySlots = useCallback((partial: Partial<AiFormData>) => {
    setForm((f) => ({ ...f, ...partial }));
  }, []);

  function toggleType(type: TripType) {
    update(
      "tripTypes",
      form.tripTypes.includes(type)
        ? form.tripTypes.filter((t) => t !== type)
        : [...form.tripTypes, type]
    );
  }

  function validateStep(currentStep: number): string | null {
    if (currentStep === 1) {
      if (!form.destination.trim()) return t("destination");
      if (form.dateFlexible && !form.desiredDurationDays) return t("duration");
      if (!form.dateFlexible && (!form.exactStartDate || !form.exactEndDate)) {
        return t("exactDates");
      }
    }
    if (currentStep === 2) {
      if (!form.travelerCount || !form.adults) return t("travelers");
    }
    if (currentStep === 3) {
      if (form.tripTypes.length === 0) return t("tripType");
    }
    if (currentStep === 5) {
      if (!form.name.trim() || !form.email.trim()) return t("contact");
      if (!form.gdprConsent || !form.termsAccepted) {
        return t("consent");
      }
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(5, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  /** Jumps straight to a step — used when the assistant has gathered enough to skip ahead. */
  function goToStep(target: number) {
    setError(null);
    setStep(Math.max(1, Math.min(5, target)));
  }

  async function handleSubmit() {
    const err = validateStep(5);
    if (err) {
      setError(err);
      return;
    }
    setAnalyzing(true);
    try {
      // Phase 2 (pure SQL/Prisma matching, CDC §C.2) runs server-side — real
      // trip/agency rows can't be read from the browser.
      const res = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, locale }),
      });
      if (!res.ok) throw new Error("match request failed");
      const matches = (await res.json()) as MatchResult & { agencyNames: Record<string, string> };
      window.localStorage.setItem(
        RESULT_KEY,
        JSON.stringify({
          form,
          trips: matches.trips,
          fallback: matches.fallback,
          // Carries the per-trip reasoning so the results page can explain each
          // recommendation instead of just ranking them silently.
          scored: matches.scored,
          agencyNames: matches.agencyNames,
        })
      );
      window.localStorage.removeItem(DRAFT_KEY);
      router.push("/demande/resultats");
    } catch {
      // §C.3's "never a blank screen" applies to the request itself too — a
      // failed match call must degrade to an explicit retry, not a dead end.
      setError(t("submit"));
    } finally {
      setAnalyzing(false);
    }
  }

  return {
    step,
    form,
    error,
    analyzing,
    setError,
    update,
    applySlots,
    toggleType,
    goNext,
    goBack,
    goToStep,
    handleSubmit,
    missingRequired: missingRequiredFields(form),
  };
}

export type AiFormStateApi = ReturnType<typeof useAiFormState>;
