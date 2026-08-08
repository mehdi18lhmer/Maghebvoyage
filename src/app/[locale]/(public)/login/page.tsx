"use client";

import { Suspense, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function LoginForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const callbackUrl = from && from.startsWith("/") ? from : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError(t("errorRequiredCredentials"));
      return;
    }

    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });

    if (!result || result.error) {
      setLoading(false);
      setError(t("errorInvalidCredentials"));
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError(t("errorRequiredEmail"));
      return;
    }

    setLoading(true);
    // callbackUrl is locale-prefixed — auth.ts's sendVerificationRequest reads
    // the locale back out of it to pick which language to send the email in.
    const result = await signIn("resend", {
      email,
      redirect: false,
      callbackUrl: `/${locale}${callbackUrl}`,
    });
    setLoading(false);

    if (!result || result.error) {
      setError(t("errorGeneric"));
      return;
    }

    setMagicLinkSent(true);
  }

  if (magicLinkSent) {
    return (
      <Card className="w-full max-w-sm gap-6 p-8 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-6 text-primary" />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-heading text-xl font-bold">{t("magicLinkSentTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("magicLinkSentBody", { email })}</p>
        </div>
        <Button variant="outline" onClick={() => setMagicLinkSent(false)}>
          {t("backToOptions")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm gap-6 p-8">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">{t("loginTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("loginSubtitle")}</p>
      </div>

      <Tabs defaultValue="password" onValueChange={() => setError(null)}>
        <TabsList className="w-full">
          <TabsTrigger value="password">{t("tabPassword")}</TabsTrigger>
          <TabsTrigger value="magiclink">{t("tabMagicLink")}</TabsTrigger>
        </TabsList>

        <TabsContent value="password">
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
                autoComplete="current-password"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : t("submitLogin")}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="magiclink">
          <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="magic-email">{t("emailLabel")}</Label>
              <Input
                id="magic-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <p className="text-xs text-muted-foreground">{t("magicLinkHint")}</p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : t("submitMagicLink")}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t("createAccount")}
        </Link>
      </p>
    </Card>
  );
}

/**
 * `useSearchParams()` opts the tree into client-side rendering for anything
 * outside a Suspense boundary — mirrors the same requirement on the
 * agency/admin `/login` page.
 */
export default function ClientLoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 py-14 sm:px-6">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
