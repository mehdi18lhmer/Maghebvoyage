"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatPrice, tripTypeLabel } from "@/lib/format";
import type { TripType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { STEP_TITLES, type AiFormStateApi } from "@/components/ai/use-ai-form-state";

/**
 * Purely presentational now — all state lives in useAiFormState(), called once
 * in the page and shared with the assistant panel, so a spoken answer and a
 * typed one land in the exact same form.
 */

const BUDGET_MIN = 200;
const BUDGET_MAX = 3000;
/** Quick-set presets shown as tier buttons, per the reference sheet's step 2. */
const BUDGET_TIERS = [
  { label: "Économique", value: 400 },
  { label: "Moyen", value: 800 },
  { label: "Confort", value: 1500 },
  { label: "Premium", value: 2500 },
];

const TYPES: TripType[] = [
  "DESERT",
  "TREKKING",
  "BEACH",
  "CULTURAL",
  "ADVENTURE",
  "CITY_BREAK",
  "GASTRONOMY",
  "PILGRIMAGE",
];

export function AiRequestForm(api: AiFormStateApi) {
  const { step, form, error, analyzing, update, toggleType, goNext, goBack, handleSubmit } = api;

  if (analyzing) {
    return (
      <Card className="flex flex-col items-center gap-4 p-12 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-accent">
          <Sparkles className="size-7 animate-pulse text-primary" />
        </span>
        <h2 className="font-heading text-lg font-bold">Analyse de votre demande…</h2>
        <p className="text-sm text-muted-foreground">
          Nous cherchons les voyages qui correspondent le mieux à vos critères.
        </p>
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="gap-0 p-6 sm:p-8">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-heading text-base font-bold">{STEP_TITLES[step - 1]}</span>
          <span className="font-medium text-muted-foreground">Étape {step} sur 5</span>
        </div>
        <Progress value={(step / 5) * 100} />
      </div>

      {step === 1 && (
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="destination">Destination souhaitée *</Label>
            <Input
              id="destination"
              placeholder="Maroc, Tunisie, Sahara, Marrakech..."
              value={form.destination}
              onChange={(e) => update("destination", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Flexibilité des dates *</Label>
            <RadioGroup
              value={form.dateFlexible ? "flexible" : "exact"}
              onValueChange={(v) => update("dateFlexible", v === "flexible")}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border p-3 font-normal",
                  form.dateFlexible && "border-primary bg-accent"
                )}
              >
                <RadioGroupItem value="flexible" /> Dates flexibles
              </Label>
              <Label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border p-3 font-normal",
                  !form.dateFlexible && "border-primary bg-accent"
                )}
              >
                <RadioGroupItem value="exact" /> Dates précises
              </Label>
            </RadioGroup>
          </div>
          {form.dateFlexible ? (
            <div className="space-y-1.5">
              <Label htmlFor="duration">Durée souhaitée (jours) *</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                value={form.desiredDurationDays}
                onChange={(e) => update("desiredDurationDays", e.target.value)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start">Date de départ *</Label>
                <Input
                  id="start"
                  type="date"
                  value={form.exactStartDate}
                  onChange={(e) => update("exactStartDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end">Date de retour *</Label>
                <Input
                  id="end"
                  type="date"
                  value={form.exactEndDate}
                  onChange={(e) => update("exactEndDate", e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="travelers">Voyageurs *</Label>
              <Input
                id="travelers"
                type="number"
                min={1}
                value={form.travelerCount}
                onChange={(e) => update("travelerCount", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adults">Adultes *</Label>
              <Input
                id="adults"
                type="number"
                min={0}
                value={form.adults}
                onChange={(e) => update("adults", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="children">Enfants</Label>
              <Input
                id="children"
                type="number"
                min={0}
                value={form.children}
                onChange={(e) => update("children", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-3 rounded-xl border bg-secondary/40 p-4">
            <Label>Budget maximum par personne *</Label>
            <p className="text-center font-heading text-3xl font-extrabold tabular-nums">
              {formatPrice(form.budgetMax)}
            </p>
            <Slider
              value={[form.budgetMax]}
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              step={10}
              onValueChange={([v]) => update("budgetMax", v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatPrice(BUDGET_MIN)}</span>
              <span>{formatPrice(BUDGET_MAX)}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {BUDGET_TIERS.map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => update("budgetMax", value)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-semibold transition-colors",
                    form.budgetMax === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Types de voyage *</Label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((type) => (
                <button key={type} type="button" onClick={() => toggleType(type)}>
                  <Badge
                    variant={form.tripTypes.includes(type) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer px-3 py-1",
                      !form.tripTypes.includes(type) && "text-muted-foreground"
                    )}
                  >
                    {tripTypeLabel(type)}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="style">Style de voyage</Label>
              <Input
                id="style"
                placeholder="Aventure, détente, immersion..."
                value={form.style}
                onChange={(e) => update("style", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accommodation">Hébergement préféré</Label>
              <Input
                id="accommodation"
                placeholder="Riad, hôtel, bivouac..."
                value={form.accommodation}
                onChange={(e) => update("accommodation", e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="transport" className="font-normal">
              Transport inclus souhaité
            </Label>
            <Switch
              id="transport"
              checked={form.transportIncluded}
              onCheckedChange={(v) => update("transportIncluded", v)}
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="activities">Activités préférées</Label>
            <Input
              id="activities"
              placeholder="désert, randonnée, plage, gastronomie..."
              value={form.activities}
              onChange={(e) => update("activities", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="constraints">Contraintes particulières</Label>
            <Textarea
              id="constraints"
              rows={3}
              placeholder="Mobilité réduite, régime alimentaire, voyage en famille..."
              value={form.constraints}
              onChange={(e) => update("constraints", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="language">Langue préférée du guide</Label>
            <Input
              id="language"
              placeholder="Français, anglais, arabe..."
              value={form.language}
              onChange={(e) => update("language", e.target.value)}
            />
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom complet *</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Pays de résidence</Label>
              <Input id="country" value={form.country} onChange={(e) => update("country", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2 rounded-lg border bg-secondary/40 p-3 text-sm">
            <div className="flex items-start gap-2">
              <Checkbox
                id="gdpr"
                checked={form.gdprConsent}
                onCheckedChange={(v) => update("gdprConsent", v === true)}
              />
              <Label htmlFor="gdpr" className="font-normal leading-snug">
                J&apos;accepte que mes données soient utilisées pour me proposer des voyages adaptés (RGPD).
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={form.termsAccepted}
                onCheckedChange={(v) => update("termsAccepted", v === true)}
              />
              <Label htmlFor="terms" className="font-normal leading-snug">
                J&apos;accepte les{" "}
                <a href="/legal/cgu" target="_blank" className="underline">
                  CGU
                </a>
                .
              </Label>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex justify-between gap-3 border-t pt-5">
        <Button type="button" variant="outline" onClick={goBack} disabled={step === 1}>
          Retour
        </Button>
        {step < 5 ? (
          <Button type="button" onClick={goNext}>
            Continuer
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit}>
            Voir mes suggestions
          </Button>
        )}
      </div>
    </Card>
  );
}
