import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BarChart3, Download, FileBarChart, FileSpreadsheet, FileText, Filter,
  Package, Ship, Truck, Users, DollarSign, Globe2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChips } from "@/components/filter-chips";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  REPORTS, CATEGORY_LABEL, presetRange, type RangePreset, type ReportCategory,
} from "@/lib/reports/data";
import { exportCsv, exportExcel, exportPdf } from "@/lib/reports/export";

export const Route = createFileRoute("/_app/reports")({ component: ReportsPage });

const CATEGORY_ICON: Record<ReportCategory, typeof FileBarChart> = {
  trade: BarChart3,
  finance: DollarSign,
  logistics: Ship,
  network: Users,
  catalog: Package,
  compliance: FileText,
};

const CATEGORY_TINT: Record<ReportCategory, string> = {
  trade: "bg-gradient-primary text-primary-foreground",
  finance: "bg-gradient-gold text-gold-foreground",
  logistics: "bg-blue-500/15 text-blue-400",
  network: "bg-purple-500/15 text-purple-400",
  catalog: "bg-emerald-500/15 text-emerald-400",
  compliance: "bg-rose-500/15 text-rose-400",
};

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "ytd", label: "YTD" },
  { value: "12m", label: "12M" },
  { value: "all", label: "All" },
];

function ReportsPage() {
  const [preset, setPreset] = useState<RangePreset>("90d");
  const [category, setCategory] = useState<ReportCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const range = useMemo(() => {
    if (customFrom && customTo) {
      const from = new Date(customFrom); const to = new Date(customTo);
      if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && from <= to) return { from, to };
    }
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return REPORTS.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (q && !(`${r.name} ${r.description}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [category, query]);

  const globalKpis = useMemo(() => {
    const allRows = REPORTS.map((r) => r.rows(range));
    const totalRows = allRows.reduce((s, rs) => s + rs.length, 0);
    return [
      { label: "Reports", value: REPORTS.length.toString(), icon: FileBarChart, tint: "bg-gradient-primary text-primary-foreground" },
      { label: "Data points", value: totalRows.toLocaleString(), icon: BarChart3, tint: "bg-gradient-gold text-gold-foreground" },
      { label: "Categories", value: Object.keys(CATEGORY_LABEL).length.toString(), icon: Globe2, tint: "bg-blue-500/15 text-blue-400" },
      { label: "Range", value: `${range.from.toISOString().slice(0, 10)} → ${range.to.toISOString().slice(0, 10)}`, icon: Filter, tint: "bg-emerald-500/15 text-emerald-400" },
    ];
  }, [range]);

  function handleExport(id: string, format: "csv" | "xls" | "pdf") {
    const report = REPORTS.find((r) => r.id === id);
    if (!report) return;
    try {
      const rows = report.rows(range);
      if (!rows.length) { toast.info(`${report.name} has no data in selected range.`); return; }
      if (format === "csv") exportCsv(report, rows);
      else if (format === "xls") exportExcel(report, rows);
      else exportPdf(report, rows, range);
      toast.success(`${report.name} · ${format.toUpperCase()} export ready`);
    } catch (e) {
      toast.error(`Export failed: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  const previewReport = previewId ? REPORTS.find((r) => r.id === previewId) : null;
  const previewRows = previewReport ? previewReport.rows(range) : [];

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Enterprise reporting · CSV, Excel and PDF exports across every workspace"
        icon={FileBarChart}
        actions={
          <Button variant="outline" className="gap-1.5" onClick={() => toast.message("Scheduling", { description: "Configure delivery cadence in Settings → Notifications." })}>
            <Sparkles className="h-4 w-4" /> Schedule digest
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {globalKpis.map((k) => (
          <Card key={k.label} className="p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className="mt-1 text-lg font-display font-bold truncate">{k.value}</div>
            </div>
            <div className={`h-9 w-9 shrink-0 rounded-xl grid place-items-center ${k.tint}`}>
              <k.icon className="h-4 w-4" />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-medium text-muted-foreground">Search reports</label>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. invoices, shipments…" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as ReportCategory | "all")}>
              <SelectTrigger className="mt-1 w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(Object.keys(CATEGORY_LABEL) as ReportCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Range</label>
            <div className="mt-1"><FilterChips value={preset} onChange={(v) => { setPreset(v); setCustomFrom(""); setCustomTo(""); }} options={PRESETS} /></div>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="mt-1 w-[160px]" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="mt-1 w-[160px]" />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((r) => {
          const rows = r.rows(range);
          const summary = r.summary ? r.summary(rows) : [];
          const Icon = CATEGORY_ICON[r.category];
          return (
            <Card key={r.id} className="p-5 flex flex-col hover:border-primary/40 transition">
              <div className="flex items-start justify-between mb-3">
                <div className={`h-11 w-11 rounded-xl grid place-items-center ${CATEGORY_TINT[r.category]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{CATEGORY_LABEL[r.category]}</span>
              </div>
              <h3 className="font-display font-bold text-base">{r.name}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{r.description}</p>
              {summary.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {summary.slice(0, 4).map((s) => (
                    <div key={s.label} className="rounded-lg border border-border bg-background/50 p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{s.label}</div>
                      <div className="text-sm font-semibold truncate">{s.value}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-1.5">
                <Button size="sm" variant="ghost" className="gap-1.5 h-8" onClick={() => setPreviewId(r.id)}>
                  <FileText className="h-3.5 w-3.5" /> Preview
                </Button>
                <div className="ms-auto flex items-center gap-1">
                  <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => handleExport(r.id, "csv")} title="Export CSV">
                    <Download className="h-3.5 w-3.5" /> CSV
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => handleExport(r.id, "xls")} title="Export Excel">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> XLS
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => handleExport(r.id, "pdf")} title="Export PDF">
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">{rows.length.toLocaleString()} rows in range</div>
            </Card>
          );
        })}
      </div>

      {previewReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => setPreviewId(null)}>
          <div className="w-full max-w-5xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-elegant flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
              <div className="min-w-0">
                <h2 className="font-display font-bold text-lg truncate">{previewReport.name}</h2>
                <p className="text-xs text-muted-foreground">{previewReport.description} · {previewRows.length.toLocaleString()} rows</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => handleExport(previewReport.id, "csv")}><Download className="h-3.5 w-3.5" /> CSV</Button>
                <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => handleExport(previewReport.id, "xls")}><FileSpreadsheet className="h-3.5 w-3.5" /> XLS</Button>
                <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => handleExport(previewReport.id, "pdf")}><FileText className="h-3.5 w-3.5" /> PDF</Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => setPreviewId(null)}>Close</Button>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {previewReport.columns.map((c: any) => (
                      <th key={String(c.key)} className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-${c.align ?? "left"}`}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 200).map((row: any, i: number) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/30">
                      {previewReport.columns.map((c: any) => {
                        const v = c.format ? c.format(row) : row[c.key];
                        return <td key={String(c.key)} className={`px-3 py-2 tabular-nums text-${c.align ?? "left"}`}>{String(v ?? "")}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRows.length > 200 && (
                <div className="p-3 text-center text-xs text-muted-foreground border-t border-border">
                  Showing first 200 rows · export for the full dataset ({previewRows.length.toLocaleString()} rows)
                </div>
              )}
              {previewRows.length === 0 && (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No data in the selected range. Widen the date filter or pick a different period.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
