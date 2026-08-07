"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Agency, AgencyVerificationStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";

const TABS: { value: AgencyVerificationStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Toutes" },
  { value: "PENDING", label: "En attente" },
  { value: "UNDER_REVIEW", label: "En examen" },
  { value: "VERIFIED", label: "Vérifiées" },
  { value: "REJECTED", label: "Rejetées" },
  { value: "SUSPENDED", label: "Suspendues" },
];

export function AgenciesTable({ agencies }: { agencies: Agency[] }) {
  const [tab, setTab] = useState<AgencyVerificationStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return agencies
      .filter((a) => tab === "ALL" || a.verificationStatus === tab)
      .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
  }, [agencies, tab, search]);

  const columns: DataTableColumn<Agency>[] = [
    { key: "name", header: "Agence", cell: (a) => <span className="font-medium">{a.name}</span> },
    { key: "zones", header: "Zones", cell: (a) => a.zones.join(", ") },
    { key: "email", header: "Email", cell: (a) => a.contactEmail },
    { key: "status", header: "Statut", cell: (a) => <StatusBadge kind="agency" status={a.verificationStatus} /> },
    {
      key: "createdAt",
      header: "Inscrite le",
      sortable: true,
      sortValue: (a) => a.createdAt,
      cell: (a) => formatDate(a.createdAt),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (a) => (
        <Button variant="outline" size="sm" asChild onClick={(e) => e.stopPropagation()}>
          <Link href={`/admin/agences/${a.id}`}>Voir le dossier</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as AgencyVerificationStatus | "ALL")}>
          <TabsList className="flex-wrap">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher une agence" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(a) => a.id}
        emptyState="Aucune agence dans cette catégorie."
      />
    </div>
  );
}
