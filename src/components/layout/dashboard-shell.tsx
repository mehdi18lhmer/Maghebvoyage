"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  href: string;
  label: string;
  /**
   * Pre-rendered JSX (e.g. `<LayoutDashboard className="size-4" />`), not a
   * component reference. The layouts that build these arrays are Server
   * Components (they call `auth()`/Prisma directly), and handing a bare
   * lucide-react component *reference* across the server/client boundary into
   * this Client Component breaks RSC serialization — "Functions cannot be
   * passed directly to Client Components". Rendering the icon before it
   * crosses the boundary sidesteps that entirely.
   */
  icon: React.ReactNode;
}

/**
 * "/agency/voyages" is a string-prefix of "/agency/voyages/new", so a naive
 * `pathname.startsWith(item.href)` lights up both "Mes voyages" and
 * "Publier un voyage" at once. Only the single longest-matching href wins.
 */
function activeHref(items: DashboardNavItem[], pathname: string): string | null {
  let best: string | null = null;
  for (const item of items) {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (best === null || item.href.length > best.length)) {
      best = item.href;
    }
  }
  return best;
}

function NavLinks({ items, pathname }: { items: DashboardNavItem[]; pathname: string }) {
  const current = activeHref(items, pathname);
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.href === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Sidebar's inner content, shared between the desktop rail and the mobile sheet. */
function SidebarBody({
  navItems,
  roleLabel,
  identityLabel,
  pathname,
}: {
  navItems: DashboardNavItem[];
  roleLabel: string;
  identityLabel: string;
  pathname: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 px-2 font-heading text-[1.05rem] font-bold text-sidebar-foreground"
      >
        <BrandMark className="text-sidebar-primary" />
        MaghrebVoyage
      </Link>
      <p className="mb-2 px-2 text-xs font-semibold tracking-wide text-sidebar-foreground/50 uppercase">
        {roleLabel}
      </p>
      <NavLinks items={navItems} pathname={pathname} />
      <div className="mt-auto space-y-3 border-t border-sidebar-border pt-4">
        <p className="truncate px-2 text-sm text-sidebar-foreground/70">{identityLabel}</p>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="size-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}

export function DashboardShell({
  navItems,
  roleLabel,
  identityLabel,
  children,
}: {
  navItems: DashboardNavItem[];
  roleLabel: string;
  identityLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar px-4 py-6 md:flex">
        <SidebarBody
          navItems={navItems}
          roleLabel={roleLabel}
          identityLabel={identityLabel}
          pathname={pathname}
        />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/" className="flex items-center gap-2 font-heading font-bold">
            <BrandMark className="text-primary" />
            MaghrebVoyage
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-6 [&_[data-slot=sheet-close]]:text-sidebar-foreground">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SidebarBody
                navItems={navItems}
                roleLabel={roleLabel}
                identityLabel={identityLabel}
                pathname={pathname}
              />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 bg-secondary/40 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
