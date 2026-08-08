"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AiFormStateApi } from "@/components/ai/use-ai-form-state";
import { AiRequestForm } from "@/components/ai/ai-request-form";

/**
 * Live récapitulatif of everything the assistant has captured.
 *
 * This is the wizard's data in a read-first form: rows fill in as the traveller
 * talks, so the conversation stays the main interface and the form is just the
 * receipt. The full 5-step questionnaire is still one click away (CDC §B
 * requires a visible multi-step form, and it remains the thing that actually
 * validates), but nobody has to touch it.
 *
 * The two consent checkboxes live here rather than in the conversation on
 * purpose — §7 marks both "Bloquant", and consent has to be a deliberate click.
 */

interface RowProps {
  label: string;
  value: string | null;
  required?: boolean;
  toSpecify: string;
}

function Row({ label, value, required, toSpecify }: RowProps) {
  const filled = value !== null && value !== "";
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      {filled ? (
        <span className="flex items-start gap-1.5 text-right text-sm font-medium">
          <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
          {value}
        </span>
      ) : (
        <span
          className={cn(
            "text-right text-sm",
            required ? "font-medium text-warning" : "text-muted-foreground/60"
          )}
        >
          {required ? toSpecify : "—"}
        </span>
      )}
    </div>
  );
}

export function TripRecapPanel(api: AiFormStateApi) {
  const { form, error, analyzing, missingRequired, update, handleSubmit } = api;
  const [showFullForm, setShowFullForm] = useState(false);
  const locale = useLocale();
  const t = useTranslations("AiPlanner.recap");
  const tAnalyzing = useTranslations("AiPlanner.analyzing");
  const tRoot = useTranslations("AiPlanner");
  const tType = useTranslations("TripType");

  const ready = missingRequired.length === 0;
  const consentGiven = form.gdprConsent && form.termsAccepted;

  if (analyzing) {
    return (
      <Card className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent">
          <Sparkles className="size-6 animate-pulse text-primary" />
        </span>
        <h2 className="font-heading text-base font-bold">{tAnalyzing("title")}</h2>
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (showFullForm) {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowFullForm(false)}
        >
          {t("backToRecap")}
        </Button>
        <AiRequestForm {...api} />
      </div>
    );
  }

  const travellers = form.travelerCount
    ? form.children && form.children !== "0"
      ? t("travelersWithChildren", { n: form.travelerCount, children: Number(form.children) })
      : t("travelersValue", { n: form.travelerCount })
    : null;

  const dates = form.dateFlexible
    ? form.desiredDurationDays
      ? t("datesFlexible", { n: form.desiredDurationDays })
      : null
    : form.exactStartDate && form.exactEndDate
      ? `${form.exactStartDate} → ${form.exactEndDate}`
      : null;

  return (
    <Card className="gap-0 p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-base font-bold">{t("title")}</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground"
          onClick={() => setShowFullForm(true)}
        >
          <Pencil className="size-3" />
          {t("editDetail")}
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-4 divide-y">
        <Row label={t("destination")} value={form.destination || null} required toSpecify={t("toSpecify")} />
        <Row label={t("dates")} value={dates} required toSpecify={t("toSpecify")} />
        <Row label={t("travelers")} value={travellers} required toSpecify={t("toSpecify")} />
        <Row
          label={t("budgetMax")}
          value={form.budgetMax ? formatPrice(form.budgetMax, locale) : null}
          toSpecify={t("toSpecify")}
        />
        <Row
          label={t("type")}
          value={form.tripTypes.length ? form.tripTypes.map((ty) => tType(ty)).join(", ") : null}
          required
          toSpecify={t("toSpecify")}
        />
        <Row label={t("activities")} value={form.activities || null} toSpecify={t("toSpecify")} />
        <Row label={t("constraints")} value={form.constraints || null} toSpecify={t("toSpecify")} />
      </div>

      {/* Contact stays directly editable — it's the one thing a traveller
          often wants to correct after dictating it. */}
      <div className="mt-5 space-y-3 border-t pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="recap-name" className="text-xs">
            {t("name")}
          </Label>
          <Input
            id="recap-name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder={t("dictatedPlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recap-email" className="text-xs">
            {t("email")}
          </Label>
          <Input
            id="recap-email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder={t("dictatedPlaceholder")}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-lg border bg-secondary/40 p-3 text-sm">
        <p className="text-xs font-semibold text-muted-foreground">{t("consentNote")}</p>
        <div className="flex items-start gap-2">
          <Checkbox
            id="recap-gdpr"
            checked={form.gdprConsent}
            onCheckedChange={(v) => update("gdprConsent", v === true)}
          />
          <Label htmlFor="recap-gdpr" className="font-normal leading-snug">
            {t("gdpr")}
          </Label>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox
            id="recap-terms"
            checked={form.termsAccepted}
            onCheckedChange={(v) => update("termsAccepted", v === true)}
          />
          <Label htmlFor="recap-terms" className="font-normal leading-snug">
            {t.rich("terms", {
              cgu: (chunks) => (
                <a href="/legal/cgu" target="_blank" className="underline">
                  {chunks}
                </a>
              ),
            })}
          </Label>
        </div>
      </div>

      {!ready && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("missingInfo", { n: missingRequired.length })}
        </p>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        className="mt-4 w-full"
        onClick={handleSubmit}
        disabled={!ready || !consentGiven}
      >
        {tRoot("seeMySuggestions")}
      </Button>

      {ready && !consentGiven && (
        <p className="mt-2 text-center text-xs text-warning">{t("checkBothBoxes")}</p>
      )}

      {ready && consentGiven && (
        <Badge className="mt-3 w-full justify-center bg-success text-success-foreground">
          {t("readyBadge")}
        </Badge>
      )}
    </Card>
  );
}
