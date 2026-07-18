import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  Ship,
  FileText,
  Download,
  CheckCircle2,
  Circle,
  Container,
  Anchor,
  Users,
  Search,
  Package,
  Truck,
  MapPin,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/export")({
  component: ExportPage,
});

type Status = "Booked" | "Loading" | "In transit" | "Delivered";

type Shipment = {
  id: string;
  buyer: string;
  buyerCountry: string;
  to: string;
  port: string;
  prod: string;
  qty: string;
  containers: number;
  status: Status;
  progress: number;
  eta: string;
  val: string;
  timeline: { label: string; date: string; done: boolean }[];
  docs: { name: string; type: string; size: string }[];
};

const shipments: Shipment[] = [
  {
    id: "NP-2841",
    buyer: "Rotterdam Fresh BV",
    buyerCountry: "🇳🇱 Netherlands",
    to: "Rotterdam",
    port: "Port of Rotterdam",
    prod: "Oranges",
    qty: "24 T",
    containers: 2,
    status: "In transit",
    progress: 65,
    eta: "Nov 24",
    val: "$184,000",
    timeline: [
      { label: "Order confirmed", date: "Nov 08", done: true },
      { label: "Documents ready", date: "Nov 10", done: true },
      { label: "Loaded at Alexandria", date: "Nov 12", done: true },
      { label: "In transit", date: "Nov 14", done: true },
      { label: "Customs clearance", date: "Nov 22", done: false },
      { label: "Delivered", date: "Nov 24", done: false },
    ],
    docs: [
      { name: "Commercial Invoice.pdf", type: "Invoice", size: "182 KB" },
      { name: "Packing List.pdf", type: "Packing", size: "94 KB" },
      { name: "Certificate of Origin.pdf", type: "Origin", size: "212 KB" },
      { name: "Phytosanitary Certificate.pdf", type: "Health", size: "156 KB" },
      { name: "Bill of Lading.pdf", type: "B/L", size: "308 KB" },
    ],
  },
  {
    id: "NP-2843",
    buyer: "Ligure Import SRL",
    buyerCountry: "🇮🇹 Italy",
    to: "Genoa",
    port: "Porto di Genova",
    prod: "Potatoes",
    qty: "40 T",
    containers: 3,
    status: "Loading",
    progress: 25,
    eta: "Nov 27",
    val: "$96,400",
    timeline: [
      { label: "Order confirmed", date: "Nov 12", done: true },
      { label: "Documents ready", date: "Nov 14", done: true },
      { label: "Loading at Damietta", date: "Nov 16", done: false },
      { label: "In transit", date: "Nov 18", done: false },
      { label: "Delivered", date: "Nov 27", done: false },
    ],
    docs: [
      { name: "Commercial Invoice.pdf", type: "Invoice", size: "176 KB" },
      { name: "Packing List.pdf", type: "Packing", size: "88 KB" },
    ],
  },
  {
    id: "NP-2845",
    buyer: "Gulf Fresh Trading LLC",
    buyerCountry: "🇦🇪 UAE",
    to: "Jebel Ali",
    port: "Jebel Ali Port",
    prod: "Mangoes",
    qty: "12 T",
    containers: 1,
    status: "Booked",
    progress: 10,
    eta: "Nov 30",
    val: "$68,200",
    timeline: [
      { label: "Order confirmed", date: "Nov 15", done: true },
      { label: "Documents pending", date: "—", done: false },
    ],
    docs: [{ name: "Draft Invoice.pdf", type: "Invoice", size: "112 KB" }],
  },
  {
    id: "NP-2838",
    buyer: "Hansa Agri GmbH",
    buyerCountry: "🇩🇪 Germany",
    to: "Hamburg",
    port: "Port of Hamburg",
    prod: "Onions",
    qty: "60 T",
    containers: 4,
    status: "Delivered",
    progress: 100,
    eta: "Nov 12",
    val: "$142,900",
    timeline: [
      { label: "Delivered", date: "Nov 12", done: true },
    ],
    docs: [{ name: "Signed B/L.pdf", type: "B/L", size: "286 KB" }],
  },
];

const statusStyles: Record<Status, string> = {
  Booked: "bg-muted text-muted-foreground",
  Loading: "bg-warning/15 text-warning",
  "In transit": "bg-blue-500/15 text-blue-500",
  Delivered: "bg-emerald-500/15 text-emerald-500",
};

const checklist = [
  { l: "Commercial Invoice", done: true },
  { l: "Packing List", done: true },
  { l: "Certificate of Origin", done: true },
  { l: "Phytosanitary Certificate", done: true },
  { l: "Bill of Lading", done: false },
  { l: "Insurance Certificate", done: false },
];

function ExportPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      shipments.filter(
        (s) =>
          (filter === "All" || s.status === filter) &&
          (q === "" ||
            s.id.toLowerCase().includes(q.toLowerCase()) ||
            s.buyer.toLowerCase().includes(q.toLowerCase()) ||
            s.to.toLowerCase().includes(q.toLowerCase())),
      ),
    [q, filter],
  );

  const selected = shipments.find((s) => s.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl sm:text-3xl font-display font-bold">{t("export.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("export.sub")}</p>
        </div>
        <Button className="bg-gradient-primary shadow-glow gap-2 shrink-0">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t("export.new")}</span>
        </Button>
      </div>

      {/* KPI */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { l: "In transit", v: "12", c: "text-blue-500", i: Ship },
          { l: "Delivered (30d)", v: "84", c: "text-emerald-500", i: CheckCircle2 },
          { l: "Containers active", v: "38", c: "text-primary", i: Container },
          { l: "Value (30d)", v: "$3.42M", c: "text-gold", i: Package },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
            <div className="flex items-center justify-between">
              <div className="text-xs sm:text-sm text-muted-foreground">{k.l}</div>
              <k.i className={cn("h-4 w-4", k.c)} />
            </div>
            <div className={cn("mt-2 text-2xl sm:text-3xl font-display font-bold", k.c)}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Table */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-elegant overflow-hidden">
          <div className="p-4 border-b border-border space-y-3">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by shipment, buyer, port…"
                className="ps-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["All", "Booked", "Loading", "In transit", "Delivered"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition",
                    filter === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-accent",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-3 font-medium">{t("export.id")}</th>
                  <th className="text-start px-4 py-3 font-medium hidden md:table-cell">Buyer</th>
                  <th className="text-start px-4 py-3 font-medium">{t("export.product")}</th>
                  <th className="text-start px-4 py-3 font-medium">Progress</th>
                  <th className="text-end px-4 py-3 font-medium hidden sm:table-cell">{t("export.value")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className="border-t border-border hover:bg-accent/40 cursor-pointer transition"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 font-semibold">
                        <Ship className="h-4 w-4 text-primary" /> {s.id}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {s.to}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="font-medium truncate max-w-[180px]">{s.buyer}</div>
                      <div className="text-xs text-muted-foreground">{s.buyerCountry}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div>{s.prod}</div>
                      <div className="text-xs text-muted-foreground">{s.qty} · {s.containers} cont.</div>
                    </td>
                    <td className="px-4 py-4 min-w-[160px]">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-full font-medium", statusStyles[s.status])}>
                          {s.status}
                        </span>
                        <span className="text-muted-foreground">{s.progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-primary" style={{ width: `${s.progress}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-end font-mono hidden sm:table-cell">{s.val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Checklist */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <h3 className="font-display font-semibold text-lg">Export checklist</h3>
          <p className="text-xs text-muted-foreground">Required for EU shipments</p>
          <ul className="mt-4 space-y-2">
            {checklist.map((c) => (
              <li key={c.l} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                {c.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={cn("text-sm", c.done ? "line-through text-muted-foreground" : "font-medium")}>
                  {c.l}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-background p-3 text-center">
              <Anchor className="h-4 w-4 mx-auto text-primary" />
              <div className="text-lg font-display font-bold mt-1">6</div>
              <div className="text-xs text-muted-foreground">Active ports</div>
            </div>
            <div className="rounded-xl border border-border bg-background p-3 text-center">
              <Users className="h-4 w-4 mx-auto text-primary" />
              <div className="text-lg font-display font-bold mt-1">24</div>
              <div className="text-xs text-muted-foreground">Buyers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ports & Buyers */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <h3 className="font-display font-semibold text-lg mb-4 inline-flex items-center gap-2">
            <Anchor className="h-4 w-4 text-primary" /> Active ports
          </h3>
          <ul className="space-y-2">
            {[
              { p: "Port of Rotterdam", c: "🇳🇱", n: 4 },
              { p: "Port of Hamburg", c: "🇩🇪", n: 3 },
              { p: "Jebel Ali Port", c: "🇦🇪", n: 2 },
              { p: "Porto di Genova", c: "🇮🇹", n: 2 },
              { p: "Port of Marseille", c: "🇫🇷", n: 1 },
            ].map((p) => (
              <li key={p.p} className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                <span className="text-sm font-medium inline-flex items-center gap-2">
                  <span>{p.c}</span> {p.p}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">{p.n} active</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <h3 className="font-display font-semibold text-lg mb-4 inline-flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Top buyers
          </h3>
          <ul className="space-y-2">
            {[
              { b: "Rotterdam Fresh BV", c: "🇳🇱", v: "$482k" },
              { b: "Hansa Agri GmbH", c: "🇩🇪", v: "$318k" },
              { b: "Gulf Fresh Trading LLC", c: "🇦🇪", v: "$246k" },
              { b: "Ligure Import SRL", c: "🇮🇹", v: "$194k" },
              { b: "Marseille Primeurs", c: "🇫🇷", v: "$142k" },
            ].map((b) => (
              <li key={b.b} className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                <span className="text-sm font-medium inline-flex items-center gap-2 min-w-0">
                  <span>{b.c}</span> <span className="truncate">{b.b}</span>
                </span>
                <span className="text-xs font-mono font-semibold">{b.v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedId(null)}>
          <div
            className="fixed end-0 top-0 h-full w-full sm:w-[560px] bg-background border-s border-border shadow-elegant overflow-y-auto animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border p-5 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Shipment</div>
                <div className="font-display font-bold text-xl">{selected.id}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Buyer</div>
                  <div className="font-semibold">{selected.buyer}</div>
                  <div className="text-xs text-muted-foreground">{selected.buyerCountry}</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Destination</div>
                  <div className="font-semibold">{selected.to}</div>
                  <div className="text-xs text-muted-foreground">{selected.port}</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Product</div>
                  <div className="font-semibold">{selected.prod}</div>
                  <div className="text-xs text-muted-foreground">{selected.qty}</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Containers</div>
                  <div className="font-semibold inline-flex items-center gap-1">
                    <Container className="h-4 w-4 text-primary" /> {selected.containers} × 40'RC
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="font-semibold mb-3 inline-flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" /> Timeline
                </h4>
                <ol className="relative border-s border-border ps-5 space-y-4">
                  {selected.timeline.map((tl, i) => (
                    <li key={i} className="relative">
                      <span
                        className={cn(
                          "absolute -start-[27px] top-1 h-4 w-4 rounded-full border-2 grid place-items-center",
                          tl.done ? "border-emerald-500 bg-emerald-500" : "border-border bg-background",
                        )}
                      >
                        {tl.done && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </span>
                      <div className={cn("text-sm font-medium", !tl.done && "text-muted-foreground")}>{tl.label}</div>
                      <div className="text-xs text-muted-foreground">{tl.date}</div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Invoice preview */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Invoice preview</h4>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Download className="h-3 w-3" /> PDF
                  </Button>
                </div>
                <div className="rounded-xl bg-background border border-border p-4 text-sm">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Nile Exports Co.</span>
                    <span>INV-{selected.id}</span>
                  </div>
                  <div className="mt-3 flex justify-between text-sm">
                    <span>{selected.prod} · {selected.qty}</span>
                    <span className="font-mono">{selected.val}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>Freight & handling</span>
                    <span className="font-mono">included</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="font-mono text-primary">{selected.val}</span>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="font-semibold mb-3 inline-flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Documents
                </h4>
                <ul className="space-y-2">
                  {selected.docs.map((d) => (
                    <li key={d.name} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{d.name}</div>
                          <div className="text-xs text-muted-foreground">{d.type} · {d.size}</div>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
