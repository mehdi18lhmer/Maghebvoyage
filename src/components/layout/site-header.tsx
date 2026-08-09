"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Menu, Ticket } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { BrandMark } from "@/components/layout/brand-mark";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { cn } from "@/lib/utils";

/**
 * Two appearances, per the reference sheet: transparent white-on-photo while
 * sitting over the landing hero, and a solid white bar everywhere else.
 * It swaps to solid once the hero has scrolled past so the links stay legible.
 *
 * The primary "Se connecter" CTA points at the client login now (locale-aware,
 * under `[locale]`) — since the client-accounts pivot, that's who this header
 * is talking to. Agency/admin `/login` stays reachable from the agency
 * register page's "already have an account?" link instead of from here.
 * `/register/agency` still uses plain next/link — it deliberately lives
 * outside the `[locale]` segment (agency onboarding is out of i18n scope) and
 * would 404 under a `/fr/register/agency` prefix if it went through
 * next-intl's Link.
 */
export function SiteHeader() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // A signed-in client needs a way back to their bookings that isn't the
  // confirmation email — without this the account dashboard is only ever
  // reachable from a link in their inbox.
  const { data: session } = useSession();
  const isClient = session?.user?.role === "CLIENT";

  const NAV_LINKS = [
    { href: "/voyages", label: t("voyages") },
    { href: "/demande", label: t("findTrip") },
    { href: "/#comment-ca-marche", label: t("howItWorks") },
  ];

  // Both the landing and the Lien Magique page open on a full-bleed photograph.
  const overHero = pathname === "/" || pathname.startsWith("/trip/");
  const transparent = overHero && !scrolled;

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        transparent ? "bg-transparent" : "border-b bg-card/90 backdrop-blur-lg"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className={cn(
            "flex shrink-0 items-center gap-2 font-heading text-[1.05rem] font-bold tracking-tight",
            transparent && "text-white"
          )}
        >
          <BrandMark className={transparent ? "text-white" : "text-primary"} />
          {t("brand")}
        </Link>

        <nav
          className={cn(
            "hidden items-center gap-1 text-sm font-medium md:flex",
            transparent ? "text-white/80" : "text-muted-foreground"
          )}
        >
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 transition-colors",
                  transparent
                    ? "hover:bg-white/10 hover:text-white"
                    : "hover:bg-accent hover:text-accent-foreground",
                  active && (transparent ? "text-white" : "text-foreground")
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher transparent={transparent} />
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "rounded-lg",
              transparent &&
                "border-white/35 bg-white/5 text-white hover:bg-white/15 hover:text-white"
            )}
            asChild
          >
            <NextLink href="/register/agency">{t("becomeAgency")}</NextLink>
          </Button>
          {isClient ? (
            <Button size="sm" className="rounded-lg px-4" asChild>
              <Link href="/account/bookings">
                <Ticket className="size-4" />
                {t("myBookings")}
              </Link>
            </Button>
          ) : (
            <Button size="sm" className="rounded-lg px-4" asChild>
              <Link href="/login">{t("login")}</Link>
            </Button>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("md:hidden", transparent && "text-white hover:bg-white/15 hover:text-white")}
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
            <div className="flex flex-col gap-6 p-6">
              <Link href="/" className="flex items-center gap-2 font-heading font-bold">
                <BrandMark className="text-primary" />
                {t("brand")}
              </Link>
              <nav className="flex flex-col gap-4 text-sm font-medium">
                {NAV_LINKS.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="flex items-center justify-between gap-2">
                <LanguageSwitcher />
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" asChild>
                  <NextLink href="/register/agency">{t("becomeAgency")}</NextLink>
                </Button>
                {isClient ? (
                  <Button asChild>
                    <Link href="/account/bookings">
                      <Ticket className="size-4" />
                      {t("myBookings")}
                    </Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/login">{t("login")}</Link>
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
