"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

function RegisterForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const callbackUrl = from && from.startsWith("/") ? from : "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError(t("errorNameTooShort"));
      return;
    }
    if (!email.trim()) {
      setError(t("errorRequiredEmail"));
      return;
    }
    if (password.length < 8) {
      setError(t("errorPasswordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("errorPasswordMismatch"));
      return;
    }
    if (!gdprConsent || !termsAccepted) {
      setError(t("gateNotice"));
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, gdprConsent, termsAccepted }),
    });

    if (!res.ok) {
      setLoading(false);
      const body = await res.json().catch(() => null);
      setError(body?.error ?? t("errorGeneric"));
      return;
    }

    // Registration doesn't sign in on its own — do it immediately so the
    // visitor lands straight in whatever gated flow sent them here (§48).
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (!result || result.error) {
      router.push("/login");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm gap-6 p-8">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">{t("registerTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("registerSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t("nameLabel")}</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("passwordLabel")}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">{t("confirmPasswordLabel")}</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2.5">
          <div className="flex items-start gap-2">
            <Checkbox
              id="gdpr"
              checked={gdprConsent}
              onCheckedChange={(v) => setGdprConsent(v === true)}
            />
            <Label htmlFor="gdpr" className="font-normal leading-snug">
              {t.rich("gdprConsent", {
                link: (chunks) => (
                  <Link href="/legal/confidentialite" target="_blank" className="underline">
                    {chunks}
                  </Link>
                ),
              })}
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(v) => setTermsAccepted(v === true)}
            />
            <Label htmlFor="terms" className="font-normal leading-snug">
              {t.rich("termsConsent", {
                link: (chunks) => (
                  <Link href="/legal/cgu" target="_blank" className="underline">
                    {chunks}
                  </Link>
                ),
              })}
            </Label>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : t("submitRegister")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </Card>
  );
}

export default function ClientRegisterPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 py-14 sm:px-6">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
