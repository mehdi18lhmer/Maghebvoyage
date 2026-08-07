"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Email et mot de passe requis.");
      return;
    }

    setLoading(true);

    // redirect: false so a bad password renders inline instead of bouncing
    // through NextAuth's own error page.
    const result = await signIn("credentials", { email, password, redirect: false });

    if (!result || result.error) {
      setLoading(false);
      setError("Identifiants invalides. Vérifiez votre email et votre mot de passe.");
      return;
    }

    // The role lives in the session, not in this response — fetch it once to
    // decide where to land, then respect a deep link the proxy redirected
    // from (?from=/agency/voyages/new) if there was one.
    const session = await fetch("/api/auth/session").then((r) => r.json());
    const role = session?.user?.role;
    const from = searchParams.get("from");

    if (from && ((role === "AGENCY" && from.startsWith("/agency")) || (role === "ADMIN" && from.startsWith("/admin")))) {
      router.push(from);
    } else {
      router.push(role === "ADMIN" ? "/admin" : "/agency");
    }
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm gap-6 p-8">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Se connecter</h1>
        <p className="text-sm text-muted-foreground">Espace agence et administration</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="contact@atlasnomad.ma"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
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
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Se connecter"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Vous êtes une agence et n&apos;avez pas de compte ?{" "}
        <Link href="/register/agency" className="font-medium text-primary hover:underline">
          Inscrivez-vous
        </Link>
      </p>
    </Card>
  );
}

/**
 * `useSearchParams()` opts the tree into client-side rendering for anything
 * outside a Suspense boundary — without one, static prerendering of this page
 * fails outright (only surfaces in `next build`, not `next dev`, which is why
 * this slipped through until the first production build).
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
