import { redirect } from "next/navigation";
import { LayoutDashboard, ListChecks, PlusCircle, Ticket, UserCog } from "lucide-react";
import { DashboardShell, type DashboardNavItem } from "@/components/layout/dashboard-shell";
import { AgencyProvider } from "@/components/agency/agency-context";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/agency", label: "Accueil", icon: <LayoutDashboard className="size-4" /> },
  { href: "/agency/voyages", label: "Mes voyages", icon: <ListChecks className="size-4" /> },
  { href: "/agency/voyages/new", label: "Publier un voyage", icon: <PlusCircle className="size-4" /> },
  { href: "/agency/reservations", label: "Mes réservations", icon: <Ticket className="size-4" /> },
  { href: "/agency/profil", label: "Mon profil", icon: <UserCog className="size-4" /> },
];

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth alongside src/proxy.ts — see the identical comment in
  // admin/layout.tsx for why this re-check exists despite the proxy gate.
  const session = await auth();
  if (!session?.user || session.user.role !== "AGENCY" || !session.user.agencyId) {
    redirect("/login");
  }

  const agency = await prisma.agency.findUnique({ where: { id: session.user.agencyId } });
  if (!agency) {
    // The session references an agency that no longer exists (deleted account).
    // Signing out is the honest response — nothing in this dashboard is
    // meaningful without a real agency behind it.
    redirect("/login");
  }

  return (
    <AgencyProvider agency={agency}>
      <DashboardShell navItems={NAV_ITEMS} roleLabel="Espace agence" identityLabel={agency.name}>
        {children}
      </DashboardShell>
    </AgencyProvider>
  );
}
