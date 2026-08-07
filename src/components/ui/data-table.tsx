"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Sorting lives here; filtering is composed by the caller (status tabs, search
// bar, etc. above the table) and passed in via `data` already filtered —
// keeps one table implementation reusable across very different filter UIs.

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  emptyState,
  onRowClick,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [data, sort, columns]);

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed py-16 text-sm text-muted-foreground">
        {emptyState ?? "Aucun résultat."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {col.header}
                    {sort?.key === col.key ? (
                      sort.dir === "asc" ? (
                        <ArrowUp className="size-3.5" />
                      ) : (
                        <ArrowDown className="size-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 opacity-40" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow
              key={getRowId(row)}
              className={cn(onRowClick && "cursor-pointer")}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
