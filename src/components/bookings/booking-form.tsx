"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateRange, formatPrice, seatsRemaining } from "@/lib/format";
import type { GroupTrip } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Diaspora-heavy list first, then Maghreb, per the CDC's target audience. */
const COUNTRIES = [
  "France",
  "Belgique",
  "Suisse",
  "Canada",
  "Allemagne",
  "Espagne",
  "Italie",
  "Pays-Bas",
  "Royaume-Uni",
  "États-Unis",
  "Maroc",
  "Algérie",
  "Tunisie",
  "Autre",
];

type Errors = Partial<Record<"firstName" | "lastName" | "email" | "seats" | "consent", string>>;

export function BookingForm({ trip, agencyName }: { trip: GroupTrip; agencyName?: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const [seats, setSeats] = useState("1");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(false);
  const [gdpr, setGdpr] = useState(false);

  const remaining = seatsRemaining(trip.totalSpots, trip.bookedSpots);
  const numberOfSeats = Number(seats) || 1;
  const depositDue = trip.depositAmount * numberOfSeats;
  const totalPrice = trip.totalPrice * numberOfSeats;
  const balanceDue = totalPrice - depositDue;

  function validate(): Errors {
    const next: Errors = {};
    if (firstName.trim().length < 2) next.firstName = "Minimum 2 caractères.";
    if (lastName.trim().length < 2) next.lastName = "Minimum 2 caractères.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Adresse email invalide.";
    if (numberOfSeats < 1 || numberOfSeats > remaining) {
      next.seats = `Il reste ${remaining} place${remaining > 1 ? "s" : ""} sur ce départ.`;
    }
    if (!terms || !gdpr) next.consent = "Les deux cases sont obligatoires pour continuer.";
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    // Mock — not yet wired to POST /api/bookings/initiate (see task #49: this
    // Chemin B form still needs the same real-API wiring booking-summary-card.tsx
    // already has for Chemin A). Only the webhook confirms a real booking —
    // never this browser return.
    await new Promise((r) => setTimeout(r, 900));
    router.push(
      `/booking/success?trip=${trip.slug}&seats=${numberOfSeats}&name=${encodeURIComponent(
        firstName.trim()
      )}`
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <div>
          <Link
            href={`/trip/${trip.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Retour au voyage
          </Link>
          <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight">Vos informations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Elles sont transmises à l&apos;agence organisatrice pour préparer votre départ.
          </p>
        </div>

        <Card className="gap-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" htmlFor="firstName" error={errors.firstName} required>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                aria-invalid={!!errors.firstName}
                autoComplete="given-name"
              />
            </Field>
            <Field label="Nom" htmlFor="lastName" error={errors.lastName} required>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                aria-invalid={!!errors.lastName}
                autoComplete="family-name"
              />
            </Field>
          </div>

          <Field
            label="Email"
            htmlFor="email"
            error={errors.email}
            required
            hint="Votre confirmation et votre lien d'annulation y seront envoyés."
          >
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              autoComplete="email"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Téléphone" htmlFor="phone">
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78"
                autoComplete="tel"
              />
            </Field>
            <Field label="Pays de résidence" htmlFor="country">
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="country" className="w-full">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field
            label="Nombre de places"
            htmlFor="seats"
            error={errors.seats}
            required
            hint={`${remaining} place${remaining > 1 ? "s" : ""} encore disponible${remaining > 1 ? "s" : ""}.`}
          >
            <Select value={seats} onValueChange={setSeats}>
              <SelectTrigger id="seats" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: Math.max(Math.min(remaining, 8), 1) }, (_, i) => i + 1).map(
                  (n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} voyageur{n > 1 ? "s" : ""}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Message pour l'agence" htmlFor="notes" hint="Régime alimentaire, mobilité, questions…">
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations complémentaires (facultatif)"
            />
          </Field>
        </Card>

        {/* Both boxes are blocking, per CDC module F. */}
        <Card className={cn("gap-3 p-6", errors.consent && "border-destructive")}>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={terms}
              onCheckedChange={(v) => setTerms(v === true)}
              aria-label="Accepter les conditions générales d'utilisation"
            />
            <span className="leading-snug">
              J&apos;accepte les{" "}
              <Link href="/legal/cgu" target="_blank" className="font-medium text-primary hover:underline">
                conditions générales d&apos;utilisation
              </Link>{" "}
              et la{" "}
              <Link
                href="/legal/remboursements"
                target="_blank"
                className="font-medium text-primary hover:underline"
              >
                politique de remboursement
              </Link>
              .
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={gdpr}
              onCheckedChange={(v) => setGdpr(v === true)}
              aria-label="Consentement RGPD"
            />
            <span className="leading-snug">
              J&apos;accepte que mes données soient transmises à l&apos;agence organisatrice pour
              traiter ma réservation (
              <Link
                href="/legal/confidentialite"
                target="_blank"
                className="font-medium text-primary hover:underline"
              >
                politique de confidentialité
              </Link>
              ).
            </span>
          </label>
          {errors.consent && <p className="text-sm text-destructive">{errors.consent}</p>}
        </Card>
      </div>

      {/* Recap — mirrors the "Récapitulatif" panel on the reference sheet */}
      <div className="lg:col-span-2">
        <Card className="gap-0 p-6 lg:sticky lg:top-24">
          <h2 className="font-heading text-lg font-bold">Récapitulatif</h2>

          <div className="mt-4 flex gap-3">
            <div className="relative size-18 shrink-0 overflow-hidden rounded-xl bg-muted">
              <Image
                src={trip.images[0]}
                alt=""
                fill
                sizes="72px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">{trip.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDateRange(trip.startDate, trip.endDate)}
              </p>
              <p className="text-sm text-muted-foreground">
                {trip.destination} · {trip.durationDays} jours
              </p>
            </div>
          </div>

          <Separator className="my-5" />

          <dl className="space-y-2.5 text-sm">
            <Row label="Nombre de participants" value={String(numberOfSeats)} />
            <Row label="Prix par personne" value={formatPrice(trip.totalPrice)} />
            <Row label="Frais de service" value="Aucun" />
          </dl>

          <Separator className="my-5" />

          <dl className="space-y-2.5 text-sm">
            <Row label="Prix total du séjour" value={formatPrice(totalPrice)} />
            <Row label="Reste à régler sur place" value={formatPrice(balanceDue)} />
          </dl>

          <div className="mt-4 flex items-baseline justify-between rounded-xl bg-accent p-4">
            <span className="text-sm font-semibold">À payer maintenant</span>
            <span className="font-heading text-xl font-extrabold tabular-nums text-primary">
              {formatPrice(depositDue)}
            </span>
          </div>

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={submitting || remaining === 0}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Redirection vers Stripe…
              </>
            ) : (
              "Continuer vers le paiement"
            )}
          </Button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" />
            Vous serez redirigé vers Stripe pour régler l&apos;acompte
          </p>

          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
            Le solde de {formatPrice(balanceDue)} se règle directement auprès de
            {agencyName ? ` ${agencyName}` : " l'agence"}, sur place.
          </p>
        </Card>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
