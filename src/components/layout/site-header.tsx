"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/voyages", label: "Voyages" },
  { href: "/demande", label: "Trouver mon voyage" },
  { href: "/#comment-ca-marche", label: "Comment ça marche" },
];

/**
 * Two appearances, per the reference sheet: transparent white-on-photo while
 * sitting over the landing hero, and a solid white bar everywhere else.
 * It swaps to solid once the hero has scrolled past so the links stay legible.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

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
          MaghrebVoyage
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
            <Link href="/register/agency">Devenir agence</Link>
          </Button>
          <Button size="sm" className="rounded-lg px-4" asChild>
            <Link href="/login">Se connecter</Link>
          </Button>
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
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="flex flex-col gap-6 p-6">
              <Link href="/" className="flex items-center gap-2 font-heading font-bold">
                <BrandMark className="text-primary" />
                MaghrebVoyage
              </Link>
              <nav className="flex flex-col gap-4 text-sm font-medium">
                {NAV_LINKS.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="flex flex-col gap-2">
                <Button variant="outline" asChild>
                  <Link href="/register/agency">Devenir agence</Link>
                </Button>
                <Button asChild>
                  <Link href="/login">Se connecter</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
