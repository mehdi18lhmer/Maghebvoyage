"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatPrice, tripTypeLabel } from "@/lib/format";
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
}

function Row({ label, value, required }: RowProps) {
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
          {required ? "à préciser" : "—"}
        </span>
      )}
    </div>
  );
}

export function TripRecapPanel(api: AiFormStateApi) {
  const { form, error, analyzing, missingRequired, update, handleSubmit } = api;
  const [showFullForm, setShowFullForm] = useState(false);

  const ready = missingRequired.length === 0;
  const consentGiven = form.gdprConsent && form.termsAccepted;

  if (analyzing) {
    return (
      <Card className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent">
          <Sparkles className="size-6 animate-pulse text-primary" />
        </span>
        <h2 className="font-heading text-base font-bold">Analyse de votre demande…</h2>
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
          ← Revenir au récapitulatif
        </Button>
        <AiRequestForm {...api} />
      </div>
    );
  }

  const travellers = form.travelerCount
    ? `${form.travelerCount} pers.${form.children && form.children !== "0" ? ` (dont ${form.children} enfant${Number(form.children) > 1 ? "s" : ""})` : ""}`
    : null;

  const dates = form.dateFlexible
    ? form.desiredDurationDays
      ? `${form.desiredDurationDays} jours (flexibles)`
      : null
    : form.exactStartDate && form.exactEndDate
      ? `${form.exactStartDate} → ${form.exactEndDate}`
      : null;

  return (
    <Card className="gap-0 p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-base font-bold">Récapitulatif</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground"
          onClick={() => setShowFullForm(true)}
        >
          <Pencil className="size-3" />
          Modifier en détail
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Se remplit au fil de la conversation — vous n&apos;avez rien à saisir.
      </p>

      <div className="mt-4 divide-y">
        <Row label="Destination" value={form.destination || null} required />
        <Row label="Dates" value={dates} required />
        <Row label="Voyageurs" value={travellers} required />
        <Row label="Budget max" value={form.budgetMax ? formatPrice(form.budgetMax) : null} />
        <Row
          label="Type"
          value={form.tripTypes.length ? form.tripTypes.map(tripTypeLabel).join(", ") : null}
          required
        />
        <Row label="Activités" value={form.activities || null} />
        <Row label="Contraintes" value={form.constraints || null} />
      </div>

      {/* Contact stays directly editable — it's the one thing a traveller
          often wants to correct after dictating it. */}
      <div className="mt-5 space-y-3 border-t pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="recap-name" className="text-xs">
            Nom complet *
          </Label>
          <Input
            id="recap-name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Dicté par l'assistant…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recap-email" className="text-xs">
            Email *
          </Label>
          <Input
            id="recap-email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="Dicté par l'assistant…"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-lg border bg-secondary/40 p-3 text-sm">
        <p className="text-xs font-semibold text-muted-foreground">
          À cocher vous-même — l&apos;assistant ne peut pas le faire à votre place
        </p>
        <div className="flex items-start gap-2">
          <Checkbox
            id="recap-gdpr"
            checked={form.gdprConsent}
            onCheckedChange={(v) => update("gdprConsent", v === true)}
          />
          <Label htmlFor="recap-gdpr" className="font-normal leading-snug">
            J&apos;accepte que mes données soient utilisées pour me proposer des voyages adaptés
            (RGPD).
          </Label>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox
            id="recap-terms"
            checked={form.termsAccepted}
            onCheckedChange={(v) => update("termsAccepted", v === true)}
          />
          <Label htmlFor="recap-terms" className="font-normal leading-snug">
            J&apos;accepte les{" "}
            <a href="/legal/cgu" target="_blank" className="underline">
              CGU
            </a>
            .
          </Label>
        </div>
      </div>

      {!ready && (
        <p className="mt-3 text-xs text-muted-foreground">
          Il manque encore {missingRequired.length} information
          {missingRequired.length > 1 ? "s" : ""} — dites-le à l&apos;assistant, il s&apos;en occupe.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        className="mt-4 w-full"
        onClick={handleSubmit}
        disabled={!ready || !consentGiven}
      >
        Voir mes suggestions
      </Button>

      {ready && !consentGiven && (
        <p className="mt-2 text-center text-xs text-warning">
          Cochez les deux cases pour continuer.
        </p>
      )}

      {ready && consentGiven && (
        <Badge className="mt-3 w-full justify-center bg-success text-success-foreground">
          Prêt à voir vos voyages
        </Badge>
      )}
    </Card>
  );
}
