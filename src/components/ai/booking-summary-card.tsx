"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateRange, formatPrice, isSoldOut, seatsRemaining } from "@/lib/format";
import type { AiFormData } from "@/lib/ai-match";
import type { GroupTrip } from "@/lib/types";

/**
 * The booking's contact + consent step, rendered inline in the chat so the
 * whole flow — pick a trip, confirm who's going, pay — never leaves it
 * (the user's explicit choice: "Stay in chat until payment").
 *
 * Reuses the planner's own `form` fields (name/email/phone/consent) rather
 * than a separate draft: whatever Vapi or typing already filled shows up
 * pre-populated here, and edits here flow back into the same shared state.
 *
 * Consent stays real-click-only by construction: `update()` is the same
 * setter the wizard's own checkboxes use, and `ai-match.ts` never lets the
 * assistant set `gdprConsent`/`termsAccepted` from parsed speech or text.
 */
export function BookingSummaryCard({
  trip,
  agencyName,
  form,
  update,
}: {
  trip: GroupTrip;
  agencyName?: string;
  form: AiFormData;
  update: <K extends keyof AiFormData>(key: K, value: AiFormData[K]) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locale = useLocale();
  const t = useTranslations("BookingSummary");

  const seats = Math.max(1, Number(form.travelerCount) || 1);
  const remaining = seatsRemaining(trip.totalSpots, trip.bookedSpots);
  const soldOut = isSoldOut(trip.totalSpots, trip.bookedSpots) || remaining < seats;
  const depositTotal = trip.depositAmount * seats;
  const balanceTotal = (trip.totalPrice - trip.depositAmount) * seats;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const canConfirm = form.name.trim().length > 1 && emailValid && form.gdprConsent && form.termsAccepted && !soldOut;

  async function handleConfirm() {
    if (!canConfirm || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupTripId: trip.id,
          clientName: form.name.trim(),
          clientEmail: form.email.trim(),
          clientPhone: form.phone.trim() || undefined,
          clientCountry: form.country.trim() || undefined,
          numberOfSeats: seats,
          gdprConsent: true,
          termsAccepted: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? t("genericError"));
        setPending(false);
        return;
      }
      // The webhook is the only source of truth for payment state (CDC §8) —
      // this redirect just hands the client to Stripe's own hosted page.
      window.location.href = data.checkoutUrl;
    } catch {
      setError(t("networkError"));
      setPending(false);
    }
  }

  return (
    <div className="mt-2 space-y-3 rounded-xl border bg-card p-3.5 text-foreground">
      <div>
        <p className="text-sm font-semibold">{trip.title}</p>
        <p className="text-xs text-muted-foreground">
          {trip.destination} · {formatDateRange(trip.startDate, trip.endDate, locale)}
          {agencyName ? ` · ${agencyName}` : ""}
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`name-${trip.id}`} className="text-xs">
            {t("name")}
          </Label>
          <Input id={`name-${trip.id}`} value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`email-${trip.id}`} className="text-xs">
            {t("email")}
          </Label>
          <Input
            id={`email-${trip.id}`}
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`phone-${trip.id}`} className="text-xs">
            {t("phone")}
          </Label>
          <Input id={`phone-${trip.id}`} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`seats-${trip.id}`} className="text-xs">
            {t("travelers")}
          </Label>
          <Input
            id={`seats-${trip.id}`}
            type="number"
            min={1}
            max={Math.max(1, remaining)}
            value={form.travelerCount}
            onChange={(e) => update("travelerCount", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5 rounded-lg bg-secondary/50 p-2.5 text-xs">
        <div className="flex justify-between">
          <span>{t("depositOnline", { n: seats })}</span>
          <span className="font-semibold">{formatPrice(depositTotal, locale)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{t("balanceOnSite")}</span>
          <span>{formatPrice(balanceTotal, locale)}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <Checkbox
            id={`gdpr-${trip.id}`}
            checked={form.gdprConsent}
            onCheckedChange={(v) => update("gdprConsent", v === true)}
          />
          <Label htmlFor={`gdpr-${trip.id}`} className="text-xs leading-snug font-normal">
            {t("gdpr")}
          </Label>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox
            id={`terms-${trip.id}`}
            checked={form.termsAccepted}
            onCheckedChange={(v) => update("termsAccepted", v === true)}
          />
          <Label htmlFor={`terms-${trip.id}`} className="text-xs leading-snug font-normal">
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

      {soldOut && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <TriangleAlert className="size-3.5 shrink-0" />
          {t("notEnoughSeats")}
        </p>
      )}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <TriangleAlert className="size-3.5 shrink-0" />
          {error}
        </p>
      )}

      <Button className="w-full" disabled={!canConfirm || pending} onClick={handleConfirm}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
        {t("confirm")}
      </Button>
    </div>
  );
}
