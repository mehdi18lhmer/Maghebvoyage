"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tripTypeLabel } from "@/lib/format";
import { uploadFile, UploadError } from "@/lib/upload-client";
import type { TripType } from "@/lib/types";
import { cn } from "@/lib/utils";

const ZONES = ["Maroc", "Tunisie", "Algérie"];
const COUNTRIES = ["Maroc", "Tunisie", "Algérie", "Mauritanie", "Libye"];
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

const MIN_DESCRIPTION = 100;
const MAX_DOC_BYTES = 5 * 1024 * 1024;

/** CDC §J.1: min 8 characters, at least one uppercase and one digit. */
function passwordIsValid(value: string) {
  return value.length >= 8 && /[A-Z]/.test(value) && /\d/.test(value);
}

export default function AgencyRegistrationPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [manager, setManager] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [zones, setZones] = useState<string[]>([]);
  const [types, setTypes] = useState<TripType[]>([]);
  const [password, setPassword] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [terms, setTerms] = useState(false);
  const [gdpr, setGdpr] = useState(false);

  function toggle<T>(list: T[], value: T, setter: (v: T[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function pickFile(next: File | null) {
    if (next && next.size > MAX_DOC_BYTES) {
      setError("Le justificatif ne doit pas dépasser 5 Mo.");
      setFile(null);
      return;
    }
    setError(null);
    setFile(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 3) {
      setError("Le nom de l'agence doit contenir au moins 3 caractères.");
      return;
    }
    if (!manager.trim() || !email.trim() || !phone.trim() || !country || !city.trim()) {
      setError("Merci de compléter tous les champs obligatoires.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Adresse email professionnelle invalide.");
      return;
    }
    if (description.trim().length < MIN_DESCRIPTION) {
      setError(`La description doit faire au moins ${MIN_DESCRIPTION} caractères.`);
      return;
    }
    if (zones.length === 0 || types.length === 0) {
      setError("Sélectionnez au moins une zone géographique et un type de voyage.");
      return;
    }
    if (!passwordIsValid(password)) {
      setError("Le mot de passe doit faire 8 caractères minimum, avec 1 majuscule et 1 chiffre.");
      return;
    }
    if (!file) {
      setError("Le justificatif (registre de commerce ou licence) est requis.");
      return;
    }
    if (!terms || !gdpr) {
      setError("Vous devez accepter les CGU et le traitement RGPD pour continuer.");
      return;
    }

    setLoading(true);

    // §J.1: the document is uploaded to Cloudinary first (direct from the
    // browser — see src/lib/upload-client.ts), and only the resulting
    // secure_url is ever sent to our own API. The binary itself never touches
    // our server, per CDC §5.4's "stocker UNIQUEMENT l'URL".
    let verificationDocUrl: string;
    try {
      const uploaded = await uploadFile(file, "agency-document");
      verificationDocUrl = uploaded.secureUrl;
    } catch (err) {
      setLoading(false);
      setError(err instanceof UploadError ? err.message : "L'envoi du justificatif a échoué. Réessayez.");
      return;
    }

    const res = await fetch("/api/agencies/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        managerName: manager,
        contactEmail: email,
        contactPhone: phone,
        country,
        city,
        description,
        zones,
        tripTypes: types,
        password,
        verificationDocUrl,
        registrationNumber: registrationNo || undefined,
        gdprConsent: gdpr,
        termsAccepted: terms,
      }),
    });

    const body = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(body?.error ?? "Une erreur est survenue. Réessayez.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-md gap-4 p-8 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success">
          <Check className="size-8 text-success-foreground" strokeWidth={3} />
        </span>
        <h1 className="font-heading text-xl font-extrabold tracking-tight">
          Dossier soumis, en cours d&apos;examen
        </h1>
        <p className="text-sm text-muted-foreground">
          Merci {manager} ! Notre équipe examine le dossier de <strong>{name}</strong> sous 48h. Vous
          recevrez un email dès que votre agence sera vérifiée et pourra publier ses premiers
          voyages.
        </p>
        <Button className="mt-2" asChild>
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </Card>
    );
  }

  const descriptionShort = description.length > 0 && description.trim().length < MIN_DESCRIPTION;

  return (
    <Card className="w-full max-w-2xl gap-6 p-8">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Inscrire mon agence</h1>
        <p className="text-sm text-muted-foreground">
          Votre dossier est examiné sous 48h avant validation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom de l&apos;agence *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="manager">Nom du gérant *</Label>
            <Input id="manager" value={manager} onChange={(e) => setManager(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email professionnel *</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Téléphone *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+212 6 12 34 56 78"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country">Pays d&apos;exercice *</Label>
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">Ville principale *</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description de l&apos;agence *</Label>
          <Textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Depuis combien de temps existez-vous, quelles sont vos spécialités, quelles régions couvrez-vous ?"
            aria-invalid={descriptionShort}
          />
          <p className={cn("text-xs", descriptionShort ? "text-destructive" : "text-muted-foreground")}>
            {description.trim().length}/{MIN_DESCRIPTION} caractères minimum
          </p>
        </div>

        <div className="space-y-2">
          <Label>Zones géographiques *</Label>
          <div className="flex flex-wrap gap-2">
            {ZONES.map((zone) => (
              <button key={zone} type="button" onClick={() => toggle(zones, zone, setZones)}>
                <Badge
                  variant={zones.includes(zone) ? "default" : "outline"}
                  className={cn("cursor-pointer px-3 py-1", !zones.includes(zone) && "text-muted-foreground")}
                >
                  {zone}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Types de voyages proposés *</Label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((type) => (
              <button key={type} type="button" onClick={() => toggle(types, type, setTypes)}>
                <Badge
                  variant={types.includes(type) ? "default" : "outline"}
                  className={cn("cursor-pointer px-3 py-1", !types.includes(type) && "text-muted-foreground")}
                >
                  {tripTypeLabel(type)}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              8 caractères minimum, dont 1 majuscule et 1 chiffre.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="registration">N° d&apos;immatriculation</Label>
            <Input
              id="registration"
              value={registrationNo}
              onChange={(e) => setRegistrationNo(e.target.value)}
              placeholder="Facultatif"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="proof">Document justificatif *</Label>
          <label
            htmlFor="proof"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:bg-secondary/60"
          >
            <Upload className="size-4" />
            {file ? file.name : "Registre de commerce ou licence — PDF, 5 Mo max"}
          </label>
          <input
            id="proof"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* Both boxes are blocking, per CDC §J.1. */}
        <div className="space-y-2.5 rounded-xl border bg-secondary/40 p-4 text-sm">
          <label className="flex items-start gap-3">
            <Checkbox checked={terms} onCheckedChange={(v) => setTerms(v === true)} />
            <span className="leading-snug">
              J&apos;accepte les{" "}
              <Link href="/legal/cgu" target="_blank" className="font-medium text-primary hover:underline">
                conditions générales d&apos;utilisation
              </Link>{" "}
              en tant qu&apos;agence partenaire.
            </span>
          </label>
          <label className="flex items-start gap-3">
            <Checkbox checked={gdpr} onCheckedChange={(v) => setGdpr(v === true)} />
            <span className="leading-snug">
              J&apos;accepte que mes données soient traitées dans le cadre de l&apos;examen de mon
              dossier (
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
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Envoi du dossier…
            </>
          ) : (
            "Soumettre mon dossier"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Vous avez déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </Card>
  );
}
