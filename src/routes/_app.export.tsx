import { createFileRoute } from "@tanstack/react-router";
import { Plus, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/export")({
  component: ExportPage,
});

const shipments = [
  { id: "NP-2841", to: "Rotterdam 🇳🇱", prod: "Oranges · 24T", status: "In transit", eta: "Nov 24", val: "$184,000" },
  { id: "NP-2843", to: "Genoa 🇮🇹", prod: "Potatoes · 40T", status: "Loading", eta: "Nov 27", val: "$96,400" },
  { id: "NP-2845", to: "Jebel Ali 🇦🇪", prod: "Mangoes · 12T", status: "Booked", eta: "Nov 30", val: "$68,200" },
  { id: "NP-2838", to: "Hamburg 🇩🇪", prod: "Onions · 60T", status: "Delivered", eta: "Nov 12", val: "$142,900" },
  { id: "NP-2836", to: "Marseille 🇫🇷", prod: "Grapes · 18T", status: "Delivered", eta: "Nov 08", val: "$212,500" },
  { id: "NP-2834", to: "Doha 🇶🇦", prod: "Strawberries · 8T", status: "Delivered", eta: "Nov 04", val: "$78,300" },
];

const statusStyles: Record<string, string> = {
  "In transit": "bg-blue-500/15 text-blue-500",
  Loading: "bg-warning/15 text-warning",
  Booked: "bg-muted text-muted-foreground",
  Delivered: "bg-emerald-500/15 text-emerald-500",
};

function ExportPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">{t("export.title")}</h1>
          <p className="text-muted-foreground">{t("export.sub")}</p>
        </div>
        <Button className="bg-gradient-primary shadow-glow gap-2">
          <Plus className="h-4 w-4" /> {t("export.new")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { l: "In transit", v: "12", c: "text-blue-500" },
          { l: "Delivered (30d)", v: "84", c: "text-emerald-500" },
          { l: "Total value (30d)", v: "$3.42M", c: "text-primary" },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
            <div className="text-sm text-muted-foreground">{k.l}</div>
            <div className={`mt-2 text-3xl font-display font-bold ${k.c}`}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-start px-5 py-3 font-medium">{t("export.id")}</th>
                <th className="text-start px-5 py-3 font-medium">{t("export.destination")}</th>
                <th className="text-start px-5 py-3 font-medium">{t("export.product")}</th>
                <th className="text-start px-5 py-3 font-medium">{t("export.status")}</th>
                <th className="text-start px-5 py-3 font-medium">{t("export.eta")}</th>
                <th className="text-end px-5 py-3 font-medium">{t("export.value")}</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-accent/40 transition">
                  <td className="px-5 py-4 font-semibold flex items-center gap-2">
                    <Ship className="h-4 w-4 text-primary" />
                    {s.id}
                  </td>
                  <td className="px-5 py-4">{s.to}</td>
                  <td className="px-5 py-4 text-muted-foreground">{s.prod}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[s.status]}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{s.eta}</td>
                  <td className="px-5 py-4 text-end font-mono">{s.val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
