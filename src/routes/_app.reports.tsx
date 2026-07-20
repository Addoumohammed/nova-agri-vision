import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart, Download, Calendar, TrendingUp, DollarSign, Ship, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

const REPORTS = [
  { id: "r1", name: "Monthly Trade Summary", desc: "Full P&L, volume and margin breakdown", period: "July 2026", icon: DollarSign, tint: "bg-gradient-primary text-primary-foreground" },
  { id: "r2", name: "Shipment Performance", desc: "Carrier SLA, on-time and delay analysis", period: "Q2 2026", icon: Ship, tint: "bg-blue-500/15 text-blue-400" },
  { id: "r3", name: "Buyer Cohort Analysis", desc: "Repeat rate, LTV and category preferences", period: "H1 2026", icon: Users, tint: "bg-gradient-gold text-gold-foreground" },
  { id: "r4", name: "Supplier Scorecard", desc: "Quality, lead time and price competitiveness", period: "Q2 2026", icon: TrendingUp, tint: "bg-purple-500/15 text-purple-400" },
  { id: "r5", name: "Customs & Compliance Log", desc: "Documentation, clearance times, exceptions", period: "July 2026", icon: FileBarChart, tint: "bg-emerald-500/15 text-emerald-400" },
  { id: "r6", name: "Market Intelligence Digest", desc: "Price trends, forecasts and Nova AI insights", period: "Weekly", icon: TrendingUp, tint: "bg-rose-500/15 text-rose-400" },
];

const RECENT = [
  { name: "July Trade Summary.pdf", size: "2.4 MB", date: "2 hours ago" },
  { name: "Q2 Supplier Scorecard.xlsx", size: "890 KB", date: "Yesterday" },
  { name: "Customs Log — Week 28.csv", size: "412 KB", date: "3 days ago" },
  { name: "Buyer Cohort H1.pdf", size: "1.8 MB", date: "1 week ago" },
];

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ReportsPage() {
  const handleExport = (r: (typeof REPORTS)[number], format: "pdf" | "csv") => {
    const base = slug(r.name);
    if (format === "csv") {
      const csv = `Report,Period,Description\n"${r.name}","${r.period}","${r.desc}"\n`;
      download(`${base}.csv`, csv, "text/csv;charset=utf-8");
    } else {
      const txt = `NOVA PRO — ${r.name}\nPeriod: ${r.period}\n\n${r.desc}\n\nGenerated: ${new Date().toISOString()}\n`;
      download(`${base}.pdf.txt`, txt, "text/plain");
    }
    toast.success(`${r.name} exported as ${format.toUpperCase()}`);
  };

  const handleRecent = (name: string) => {
    download(name, `Nova Pro export — ${name}\nGenerated: ${new Date().toISOString()}\n`, "text/plain");
    toast.success(`Downloaded ${name}`);
  };

  const handleSchedule = () =>
    toast.message("Report scheduling", { description: "Set delivery cadence in Settings → Notifications." });

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Auto-generated performance & compliance reports"
        icon={FileBarChart}
        actions={
          <Button variant="outline" className="gap-1.5" onClick={handleSchedule}>
            <Calendar className="h-4 w-4" /> Schedule
          </Button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition group">
            <div className="flex items-start justify-between mb-4">
              <div className={`h-11 w-11 rounded-xl grid place-items-center ${r.tint}`}>
                <r.icon className="h-5 w-5" />
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{r.period}</span>
            </div>
            <h3 className="font-display font-bold text-base mb-1">{r.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{r.desc}</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => handleExport(r, "pdf")}>
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => handleExport(r, "csv")}>
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display font-bold mb-4">Recently generated</h3>
        <div className="space-y-3">
          {RECENT.map((f) => (
            <div key={f.name} className="flex items-center justify-between gap-4 py-2 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center shrink-0">
                  <FileBarChart className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.size} · {f.date}</div>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleRecent(f.name)}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
