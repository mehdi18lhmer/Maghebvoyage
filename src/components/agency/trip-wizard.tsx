"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Lock, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice, tripTypeLabel } from "@/lib/format";
import { physicalLevelFromNumber } from "@/lib/physical-level";
import { uploadFile, UploadError } from "@/lib/upload-client";
import type { GroupTrip, TripType } from "@/lib/types";
import { cn } from "@/lib/utils";

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

const STEP_TITLES = ["Informations générales", "Tarification", "Description & programme", "Photos"];

interface WizardState {
  title: string;
  destination: string;
  tripType: TripType;
  startDate: string;
  endDate: string;
  totalSpots: string;
  meetingPoint: string;
  physicalLevel: string;
  totalPrice: string;
  depositAmount: string;
  description: string;
  inclusions: string[];
  exclusions: string[];
  program: { day: number; title: string; detail: string }[];
  images: string[];
}

function emptyState(): WizardState {
  return {
    title: "",
    destination: "",
    tripType: "CULTURAL",
    startDate: "",
    endDate: "",
    totalSpots: "12",
    meetingPoint: "",
    physicalLevel: "2",
    totalPrice: "",
    depositAmount: "",
    description: "",
    inclusions: [""],
    exclusions: [""],
    program: [{ day: 1, title: "", detail: "" }],
    images: [],
  };
}

function fromTrip(trip: GroupTrip): WizardState {
  return {
    title: trip.title,
    destination: trip.destination,
    tripType: trip.tripType,
    startDate: trip.startDate,
    endDate: trip.endDate,
    totalSpots: String(trip.totalSpots),
    meetingPoint: trip.meetingPoint,
    physicalLevel: String(trip.physicalLevel),
    totalPrice: String(trip.totalPrice),
    depositAmount: String(trip.depositAmount),
    description: trip.description,
    inclusions: trip.inclusions,
    exclusions: trip.exclusions,
    program: trip.program,
    images: trip.images,
  };
}

export function TripWizard({ existingTrip }: { existingTrip?: GroupTrip }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardState>(existingTrip ? fromTrip(existingTrip) : emptyState());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Per CLAUDE.md §5: once published, only description/images/meetingPoint stay editable.
  const locked = Boolean(existingTrip && existingTrip.status !== "DRAFT");

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const totalPrice = Number(form.totalPrice) || 0;
  const depositAmount = Number(form.depositAmount) || 0;
  const minDeposit = totalPrice * 0.1;
  const depositTooLow = totalPrice > 0 && depositAmount > 0 && depositAmount < minDeposit;
  const balance = Math.max(totalPrice - depositAmount, 0);

  function validateStep(): string | null {
    if (step === 1) {
      if (!form.title.trim() || !form.destination.trim() || !form.startDate || !form.endDate) {
        return "Complétez toutes les informations générales.";
      }
      const days = (new Date(form.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (!existingTrip && days < 7) {
        return "La date de départ doit être à plus de 7 jours (délai minimum pour remplir les places).";
      }
    }
    if (step === 2) {
      if (!form.totalPrice || !form.depositAmount) return "Indiquez le prix total et l'acompte.";
      if (depositTooLow) return `L'acompte doit être d'au moins 10% du prix total (${formatPrice(minDeposit)}).`;
    }
    if (step === 3 && !form.description.trim()) {
      return "Ajoutez une description du voyage.";
    }
    return null;
  }

  function goNext() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(4, s + 1));
  }

  async function handleSubmit(status: "DRAFT" | "PUBLISHED") {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);

    // §J.4's Programme field is free text (a Textarea), not the structured
    // per-day rows this wizard edits — flattened here at the API boundary.
    const programDays = form.program
      .filter((p) => p.title.trim() || p.detail.trim())
      .map((p) => `Jour ${p.day} — ${p.title} : ${p.detail}`)
      .join("\n");

    const payload = {
      title: form.title,
      destination: form.destination,
      description: form.description,
      tripType: form.tripType,
      startDate: form.startDate,
      endDate: form.endDate,
      totalPrice: Number(form.totalPrice),
      depositAmount: Number(form.depositAmount),
      totalSpots: Number(form.totalSpots),
      // The first photo is always the cover, per the upload step's own label.
      coverImage: form.images[0] ?? null,
      images: form.images,
      inclusions: form.inclusions.filter((i) => i.trim()),
      exclusions: form.exclusions.filter((e) => e.trim()),
      meetingPoint: form.meetingPoint || null,
      programDays: programDays || null,
      physicalLevel: physicalLevelFromNumber(Number(form.physicalLevel)),
    };

    try {
      let tripId = existingTrip?.id;

      if (tripId) {
        const res = await fetch(`/api/trips/${tripId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          setError(body?.error ?? "Impossible d'enregistrer le voyage.");
          return;
        }
      } else {
        const res = await fetch("/api/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          setError(body?.error ?? "Impossible de créer le voyage.");
          return;
        }
        tripId = body.trip.id;
      }

      // Only a DRAFT can transition to PUBLISHED — an already-published trip
      // being edited just saves its (whitelisted) field changes.
      if (status === "PUBLISHED" && (!existingTrip || existingTrip.status === "DRAFT")) {
        const res = await fetch(`/api/trips/${tripId}/publish`, { method: "POST" });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          setError(body?.error ?? "Impossible de publier le voyage.");
          return;
        }
      }

      toast.success(
        locked
          ? "Modifications enregistrées"
          : status === "PUBLISHED"
            ? `${form.title || "Le voyage"} est maintenant publié`
            : `${form.title || "Le voyage"} enregistré en brouillon`
      );
      router.push("/agency/voyages");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="gap-0 p-6 sm:p-8">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-heading text-base font-bold">{STEP_TITLES[step - 1]}</span>
          <span className="font-medium text-muted-foreground">Étape {step} sur 4</span>
        </div>
        <Progress value={(step / 4) * 100} />
      </div>

      {locked && step !== 4 && step !== 3 && (
        <p className="mt-6 flex items-center gap-2 rounded-lg bg-warning-muted p-3 text-sm text-warning">
          <Lock className="size-4 shrink-0" />
          Voyage déjà publié : seuls la description, les photos et le point de rendez-vous restent
          modifiables.
        </p>
      )}

      {step === 1 && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Titre du voyage *</Label>
              <Input id="title" disabled={locked} value={form.title} onChange={(e) => update("title", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="destination">Destination *</Label>
              <Input
                id="destination"
                disabled={locked}
                value={form.destination}
                onChange={(e) => update("destination", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type de voyage *</Label>
              <Select value={form.tripType} onValueChange={(v) => update("tripType", v as TripType)} disabled={locked}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {tripTypeLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spots">Nombre total de places *</Label>
              <Input
                id="spots"
                type="number"
                min={1}
                disabled={locked}
                value={form.totalSpots}
                onChange={(e) => update("totalSpots", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start">Date de départ *</Label>
              <Input
                id="start"
                type="date"
                disabled={locked}
                value={form.startDate}
                onChange={(e) => update("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">Date de retour *</Label>
              <Input
                id="end"
                type="date"
                disabled={locked}
                value={form.endDate}
                onChange={(e) => update("endDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meeting">Point de rendez-vous</Label>
              <Input id="meeting" value={form.meetingPoint} onChange={(e) => update("meetingPoint", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Niveau physique (1 à 5)</Label>
              <Select value={form.physicalLevel} onValueChange={(v) => update("physicalLevel", v)} disabled={locked}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="price">Prix total par personne (€) *</Label>
              <Input
                id="price"
                type="number"
                min={0}
                disabled={locked}
                value={form.totalPrice}
                onChange={(e) => update("totalPrice", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deposit">Acompte par personne (€) *</Label>
              <Input
                id="deposit"
                type="number"
                min={0}
                disabled={locked}
                value={form.depositAmount}
                onChange={(e) => update("depositAmount", e.target.value)}
                className={cn(depositTooLow && "border-destructive")}
              />
              <p className="text-xs text-muted-foreground">Minimum 10% du prix total, soit {formatPrice(minDeposit)}.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x rounded-xl border bg-secondary/40 p-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Prix total</p>
              <p className="mt-1 font-heading text-lg font-bold tabular-nums">{formatPrice(totalPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Acompte maintenant</p>
              <p className="mt-1 font-heading text-lg font-bold tabular-nums text-primary">
                {formatPrice(depositAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reste sur place</p>
              <p className="mt-1 font-heading text-lg font-bold tabular-nums">{formatPrice(balance)}</p>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <ListEditor
            label="Inclus"
            items={form.inclusions}
            onChange={(items) => update("inclusions", items)}
          />
          <ListEditor
            label="Non inclus"
            items={form.exclusions}
            onChange={(items) => update("exclusions", items)}
          />

          <div className="space-y-2">
            <Label>Programme jour par jour</Label>
            <div className="space-y-3">
              {form.program.map((step, i) => (
                <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[auto_1fr_2fr_auto]">
                  <Input
                    className="w-16"
                    type="number"
                    value={step.day}
                    onChange={(e) => {
                      const program = [...form.program];
                      program[i] = { ...program[i], day: Number(e.target.value) };
                      update("program", program);
                    }}
                  />
                  <Input
                    placeholder="Titre du jour"
                    value={step.title}
                    onChange={(e) => {
                      const program = [...form.program];
                      program[i] = { ...program[i], title: e.target.value };
                      update("program", program);
                    }}
                  />
                  <Input
                    placeholder="Détail"
                    value={step.detail}
                    onChange={(e) => {
                      const program = [...form.program];
                      program[i] = { ...program[i], detail: e.target.value };
                      update("program", program);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => update("program", form.program.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  update("program", [
                    ...form.program,
                    { day: form.program.length + 1, title: "", detail: "" },
                  ])
                }
              >
                <Plus className="size-4" /> Ajouter un jour
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Photo de couverture et galerie</Label>
            <label
              htmlFor="photos"
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground hover:bg-secondary/40",
                uploading && "pointer-events-none opacity-60"
              )}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {uploading ? "Envoi en cours…" : "Importer des photos (la première sera la couverture)"}
            </label>
            <input
              id="photos"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = ""; // allows re-selecting the same file after a failed attempt
                if (files.length === 0 || form.images.length + files.length > 8) {
                  if (files.length > 0) setError("8 photos maximum.");
                  return;
                }

                setUploading(true);
                setError(null);
                try {
                  // Sequential, not Promise.all: Cloudinary signatures are
                  // timestamp-scoped, and uploading in parallel risks two
                  // requests racing for the same signing window on a slow
                  // connection. One at a time is simpler to reason about for
                  // what's normally 1-8 photos.
                  const uploaded: string[] = [];
                  for (const file of files) {
                    const { secureUrl } = await uploadFile(file, "trip-photo");
                    uploaded.push(secureUrl);
                  }
                  update("images", [...form.images, ...uploaded]);
                } catch (err) {
                  setError(err instanceof UploadError ? err.message : "L'envoi d'une photo a échoué.");
                } finally {
                  setUploading(false);
                }
              }}
            />
          </div>
          {form.images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {form.images.map((src, i) => (
                <div key={src} className="relative aspect-square overflow-hidden rounded-lg border">
                  <Image src={src} alt="" fill sizes="120px" className="object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">
                      Couverture
                    </span>
                  )}
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                    onClick={() => update("images", form.images.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex flex-wrap justify-between gap-3 border-t pt-5">
        <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          Retour
        </Button>
        <div className="flex gap-2">
          {step === 4 && !locked && (
            <Button type="button" variant="outline" onClick={() => handleSubmit("DRAFT")} disabled={submitting || uploading}>
              Enregistrer en brouillon
            </Button>
          )}
          {step < 4 ? (
            <Button type="button" onClick={goNext}>
              Continuer
            </Button>
          ) : (
            <Button type="button" onClick={() => handleSubmit("PUBLISHED")} disabled={submitting || uploading}>
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : locked ? (
                "Enregistrer les modifications"
              ) : (
                "Publier le voyage"
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function ListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={item}
              onChange={(e) => onChange(items.map((it, j) => (j === i ? e.target.value : it)))}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])}>
          <Plus className="size-4" /> Ajouter
        </Button>
      </div>
    </div>
  );
}
