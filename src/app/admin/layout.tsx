import { redirect } from "next/navigation";
import {
  BarChart3,
  Building2,
  CreditCard,
  LayoutDashboard,
  MapPinned,
  Sparkles,
  Ticket,
} from "lucide-react";
import { DashboardShell, type DashboardNavItem } from "@/components/layout/dashboard-shell";
import { auth } from "@/auth";

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/admin", label: "Accueil", icon: <LayoutDashboard className="size-4" /> },
  { href: "/admin/agences", label: "Gestion agences", icon: <Building2 className="size-4" /> },
  { href: "/admin/voyages", label: "Gestion voyages", icon: <MapPinned className="size-4" /> },
  { href: "/admin/reservations", label: "Gestion réservations", icon: <Ticket className="size-4" /> },
  { href: "/admin/paiements", label: "Gestion paiements", icon: <CreditCard className="size-4" /> },
  { href: "/admin/demandes-ia", label: "Demandes IA", icon: <Sparkles className="size-4" /> },
  { href: "/admin/analytics", label: "Analytics", icon: <BarChart3 className="size-4" /> },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: src/proxy.ts already gates /admin/**, but that check is
  // request-level and easy to forget to re-verify. A layout re-check costs one
  // session read and means this section is never accidentally exposed by a
  // future change to the proxy's matcher.
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <DashboardShell navItems={NAV_ITEMS} roleLabel="Administration" identityLabel={session.user.email ?? "Admin"}>
      {children}
    </DashboardShell>
  );
}
