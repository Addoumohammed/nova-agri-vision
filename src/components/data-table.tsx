import { useMemo, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
  accessor?: (row: T) => string | number;
  hideOn?: "sm" | "md";
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchable = true,
  searchKeys,
  filters,
  onRowClick,
  toolbar,
  emptyMessage = "No results.",
}: {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  filters?: ReactNode;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let rows = data;
    if (query && searchable) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => {
        const keys = searchKeys ?? (Object.keys(r) as (keyof T)[]);
        return keys.some((k) => String(r[k] ?? "").toLowerCase().includes(q));
      });
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.accessor) {
        rows = [...rows].sort((a, b) => {
          const av = col.accessor!(a); const bv = col.accessor!(b);
          if (av < bv) return sortDir === "asc" ? -1 : 1;
          if (av > bv) return sortDir === "asc" ? 1 : -1;
          return 0;
        });
      }
    }
    return rows;
  }, [data, query, sortKey, sortDir, columns, searchKeys, searchable]);

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-b border-border">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="ps-9" />
            </div>
          )}
          {filters}
        </div>
        <div className="flex items-center gap-2">
          {toolbar}
          <Button variant="outline" size="sm" className="gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" /> View
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={cn(
                    c.className,
                    c.hideOn === "sm" && "hidden sm:table-cell",
                    c.hideOn === "md" && "hidden md:table-cell",
                    c.sortable && "cursor-pointer select-none",
                  )}
                  onClick={() => {
                    if (!c.sortable) return;
                    if (sortKey === c.key) setSortDir(sortDir === "asc" ? "desc" : "asc");
                    else { setSortKey(c.key); setSortDir("asc"); }
                  }}
                >
                  {c.header}{c.sortable && sortKey === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">{emptyMessage}</TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
                >
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      className={cn(
                        c.className,
                        c.hideOn === "sm" && "hidden sm:table-cell",
                        c.hideOn === "md" && "hidden md:table-cell",
                      )}
                    >
                      {c.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        Showing {filtered.length} of {data.length}
      </div>
    </div>
  );
}
