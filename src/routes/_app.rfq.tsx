import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus, Package, Globe, Calendar, DollarSign, Search, Loader2, ArrowRight, FileText, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { listRfqs, createRfq, closeRfq } from "@/lib/trade.functions";
import { CURRENCIES, formatMoney } from "@/lib/currency";

export const Route = createFileRoute("/_app/rfq")({ component: RfqPage });

const INCOTERMS = ["EXW","FCA","FAS","FOB","CFR","CIF","CPT","CIP","DAP","DPU","DDP"];
const CATEGORIES = ["Fruits & Vegetables","Cereals & Grains","Pulses & Legumes","Nuts & Seeds","Oilseeds","Livestock & Dairy","Coffee & Tea","Spices","Sugar & Sweeteners"];
const CERTS = ["GlobalG.A.P.","HACCP","ISO 22000","USDA Organic","EU Organic","Halal","Kosher","Fair Trade","Rainforest Alliance","BRCGS"];

type Rfq = {
  id: string; buyer_id: string; title: string; description: string | null;
  product_category: string | null; product_name: string; quantity: number; unit: string;
  target_price: number | null; currency: string; incoterm: string | null;
  destination_country: string | null; destination_port: string | null;
  required_certifications: string[]; deadline: string | null;
  status: "draft" | "open" | "closed" | "awarded" | "cancelled";
  quotations_count: number; created_at: string;
};

function RfqPage() {
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [openCreate, setOpenCreate] = useState(false);

  const refresh = async () => {
    try {
      const rows = await listRfqs();
      setRfqs(rows as Rfq[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);

  const filtered = rfqs.filter((r) =>
    (status === "all" || r.status === status) &&
    (!query || r.title.toLowerCase().includes(query.toLowerCase()) || r.product_name.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests for Quotation"
        subtitle="Post buying needs and receive competitive quotes from verified international suppliers."
        actions={
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> New RFQ
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by title, product…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="awarded">Awarded</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading RFQs…
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-7 w-7" />
            </div>
            <div className="font-semibold">No RFQs yet</div>
            <p className="max-w-md text-sm text-muted-foreground">
              Post your first Request for Quotation to let suppliers around the world bid on your order.
            </p>
            <Button onClick={() => setOpenCreate(true)} className="mt-2">
              <Plus className="mr-2 h-4 w-4" /> Create RFQ
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <Card key={r.id} className="group transition hover:border-primary/40 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{r.title}</CardTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      <span className="truncate">{r.product_name}</span>
                      {r.product_category && <Badge variant="secondary" className="text-[10px]">{r.product_category}</Badge>}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Info icon={<Package className="h-3.5 w-3.5" />} label="Quantity" value={`${r.quantity.toLocaleString()} ${r.unit}`} />
                  {r.target_price && <Info icon={<DollarSign className="h-3.5 w-3.5" />} label="Target price" value={formatMoney(r.target_price, r.currency)} />}
                  {r.incoterm && <Info icon={<Globe className="h-3.5 w-3.5" />} label="Incoterm" value={`${r.incoterm} ${r.destination_country ?? ""}`} />}
                  {r.deadline && <Info icon={<Calendar className="h-3.5 w-3.5" />} label="Deadline" value={new Date(r.deadline).toLocaleDateString()} />}
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{r.quotations_count}</span> quotation{r.quotations_count === 1 ? "" : "s"}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate({ to: "/quotations", search: { rfq: r.id } as never })}
                  >
                    Open <ArrowRight className="ms-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateRfqDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={() => { setOpenCreate(false); void refresh(); }}
      />
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className="mt-0.5 truncate font-medium">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    closed: "bg-muted text-muted-foreground border-border",
    awarded: "bg-primary/10 text-primary border-primary/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    draft: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  };
  return <Badge variant="outline" className={`text-xs ${map[status] ?? ""}`}>{status}</Badge>;
}

function CreateRfqDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: "", description: "", product_category: "Fruits & Vegetables", product_name: "",
    quantity: 100, unit: "MT", target_price: 0, currency: "USD",
    incoterm: "FOB", destination_country: "NL", destination_port: "Rotterdam",
    deadline: "",
  });
  const [certs, setCerts] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createRfq({
        data: {
          title: form.title,
          description: form.description || undefined,
          product_category: form.product_category,
          product_name: form.product_name,
          quantity: Number(form.quantity),
          unit: form.unit,
          target_price: form.target_price > 0 ? Number(form.target_price) : undefined,
          currency: form.currency,
          incoterm: form.incoterm,
          destination_country: form.destination_country || undefined,
          destination_port: form.destination_port || undefined,
          required_certifications: certs,
          deadline: form.deadline || undefined,
        },
      });
      toast.success("RFQ posted");
      onCreated();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Request for Quotation</DialogTitle>
          <DialogDescription>Describe what you need. Verified suppliers will send quotes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Title</Label>
            <Input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. 500 MT Grade A oranges — Rotterdam Q1" />
          </div>
          <div>
            <Label>Product name</Label>
            <Input required value={form.product_name} onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.product_category} onValueChange={(v) => setForm((f) => ({ ...f, product_category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <div className="flex gap-2">
              <Input type="number" required value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} />
              <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{["MT","KG","LB","BAG","TEU","CBM"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Target price (unit)</Label>
            <div className="flex gap-2">
              <Input type="number" value={form.target_price} onChange={(e) => setForm((f) => ({ ...f, target_price: Number(e.target.value) }))} />
              <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Incoterm</Label>
            <Select value={form.incoterm} onValueChange={(v) => setForm((f) => ({ ...f, incoterm: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{INCOTERMS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Destination country (ISO-2)</Label>
            <Input maxLength={2} value={form.destination_country} onChange={(e) => setForm((f) => ({ ...f, destination_country: e.target.value.toUpperCase() }))} />
          </div>
          <div>
            <Label>Destination port</Label>
            <Input value={form.destination_port} onChange={(e) => setForm((f) => ({ ...f, destination_port: e.target.value }))} />
          </div>
          <div>
            <Label>Deadline</Label>
            <Input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Quality specs, packaging, timing, additional requirements…" />
          </div>
          <div className="sm:col-span-2">
            <Label>Required certifications</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CERTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCerts((cur) => cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c])}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${certs.includes(c) ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Publish RFQ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Re-export for use by other places
export { closeRfq };
