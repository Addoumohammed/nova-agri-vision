import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  Loader2, Send, CheckCircle2, XCircle, MessageSquare, Package, DollarSign, Clock, ArrowRightLeft, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import {
  listMyQuotations, listNegotiation, sendNegotiation, setQuotationStatus, submitQuotation,
  getRfq,
} from "@/lib/trade.functions";
import { CURRENCIES, formatMoney } from "@/lib/currency";

export const Route = createFileRoute("/_app/quotations")({
  validateSearch: (s) => z.object({ rfq: z.string().uuid().optional() }).parse(s),
  component: QuotationsPage,
});

type Quotation = {
  id: string; rfq_id: string; supplier_id: string; unit_price: number; currency: string;
  quantity: number; incoterm: string; lead_time_days: number | null; validity_date: string | null;
  payment_terms: string | null; notes: string | null; status: string; created_at: string;
  rfqs: {
    id: string; title: string; product_name: string; quantity: number; unit: string;
    currency: string; target_price: number | null; buyer_id: string;
  };
};

const INCOTERMS = ["EXW","FCA","FAS","FOB","CFR","CIF","CPT","CIP","DAP","DPU","DDP"];

function QuotationsPage() {
  const { rfq: rfqParam } = Route.useSearch();
  const [sent, setSent] = useState<Quotation[]>([]);
  const [received, setReceived] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Quotation | null>(null);
  const [openRfqDialog, setOpenRfqDialog] = useState<{ open: boolean; rfqId?: string }>({ open: !!rfqParam, rfqId: rfqParam });

  const refresh = async () => {
    try {
      const res = await listMyQuotations();
      setSent(res.sent as Quotation[]);
      setReceived(res.received as Quotation[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);
  useEffect(() => { if (rfqParam) setOpenRfqDialog({ open: true, rfqId: rfqParam }); }, [rfqParam]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations & Negotiation"
        subtitle="Compare quotes on your RFQs, negotiate terms, and accept the best offer."
        actions={
          <Button onClick={() => setOpenRfqDialog({ open: true, rfqId: undefined })}>
            <Plus className="mr-2 h-4 w-4" /> Submit quotation
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : (
        <Tabs defaultValue="received">
          <TabsList>
            <TabsTrigger value="received">Received ({received.length})</TabsTrigger>
            <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="received" className="mt-4">
            <QuotationList list={received} perspective="buyer" onOpen={setActive} />
          </TabsContent>
          <TabsContent value="sent" className="mt-4">
            <QuotationList list={sent} perspective="supplier" onOpen={setActive} />
          </TabsContent>
        </Tabs>
      )}

      {active && (
        <NegotiationDrawer
          quotation={active}
          onClose={() => setActive(null)}
          onChanged={() => { void refresh(); }}
        />
      )}

      <SubmitQuotationDialog
        state={openRfqDialog}
        onClose={() => setOpenRfqDialog({ open: false })}
        onSubmitted={() => { setOpenRfqDialog({ open: false }); void refresh(); }}
      />
    </div>
  );
}

function QuotationList({ list, perspective, onOpen }: { list: Quotation[]; perspective: "buyer" | "supplier"; onOpen: (q: Quotation) => void }) {
  if (list.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          {perspective === "buyer" ? "No quotations received yet. Post an RFQ to attract offers." : "You haven't submitted any quotations yet."}
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {list.map((q) => (
        <Card key={q.id} className="cursor-pointer transition hover:border-primary/40 hover:shadow-md" onClick={() => onOpen(q)}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{q.rfqs?.title ?? "RFQ"}</CardTitle>
              <StatusBadge status={q.status} />
            </div>
            <div className="text-xs text-muted-foreground">{q.rfqs?.product_name}</div>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 text-xs">
            <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Unit price" value={formatMoney(q.unit_price, q.currency)} />
            <Metric icon={<Package className="h-3.5 w-3.5" />} label="Quantity" value={`${q.quantity} ${q.rfqs?.unit ?? ""}`} />
            <Metric icon={<Clock className="h-3.5 w-3.5" />} label="Lead time" value={q.lead_time_days ? `${q.lead_time_days}d` : "—"} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className="mt-0.5 truncate font-medium">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    under_negotiation: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    accepted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
    expired: "bg-muted text-muted-foreground border-border",
    withdrawn: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={`text-[10px] ${map[status] ?? ""}`}>{status.replace("_", " ")}</Badge>;
}

type NegMsg = {
  id: string; quotation_id: string; sender_id: string; message: string;
  proposed_price: number | null; proposed_currency: string | null;
  proposed_lead_time_days: number | null; proposed_incoterm: string | null; created_at: string;
};

function NegotiationDrawer({ quotation, onClose, onChanged }: { quotation: Quotation; onClose: () => void; onChanged: () => void }) {
  const [msgs, setMsgs] = useState<NegMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [proposed, setProposed] = useState<{ price?: number; currency?: string; leadTime?: number; incoterm?: string }>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      setMe(data.user?.id ?? null);
    })();
  }, []);

  const refresh = async () => {
    try {
      const rows = await listNegotiation({ data: { quotation_id: quotation.id } });
      setMsgs(rows as NegMsg[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [quotation.id]);

  const isBuyer = me === quotation.rfqs?.buyer_id;

  const send = async () => {
    if (!text.trim() && !proposed.price) return;
    setSending(true);
    try {
      await sendNegotiation({
        data: {
          quotation_id: quotation.id,
          message: text.trim() || `Proposal: ${formatMoney(proposed.price ?? 0, proposed.currency ?? quotation.currency)}`,
          proposed_price: proposed.price,
          proposed_currency: proposed.currency,
          proposed_lead_time_days: proposed.leadTime,
          proposed_incoterm: proposed.incoterm,
        },
      });
      setText(""); setProposed({});
      await refresh();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSending(false); }
  };

  const setStatus = async (status: "accepted" | "rejected") => {
    try {
      await setQuotationStatus({ data: { id: quotation.id, status } });
      toast.success(`Quotation ${status}`);
      onChanged();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-4">
          <SheetTitle>{quotation.rfqs?.title}</SheetTitle>
          <div className="text-xs text-muted-foreground">
            {quotation.rfqs?.product_name} • {quotation.quantity} {quotation.rfqs?.unit} • {quotation.incoterm}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Offer" value={formatMoney(quotation.unit_price, quotation.currency)} />
            <Metric icon={<Clock className="h-3.5 w-3.5" />} label="Lead" value={quotation.lead_time_days ? `${quotation.lead_time_days} d` : "—"} />
            <Metric icon={<Package className="h-3.5 w-3.5" />} label="Status" value={quotation.status.replace("_"," ")} />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading messages…
            </div>
          ) : msgs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto mb-2 h-6 w-6 opacity-40" />
              No messages yet. Start negotiating.
            </div>
          ) : (
            <ol className="space-y-3">
              {msgs.map((m) => {
                const mine = m.sender_id === me;
                return (
                  <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "border bg-muted/40"}`}>
                      <div className="whitespace-pre-wrap">{m.message}</div>
                      {(m.proposed_price || m.proposed_lead_time_days || m.proposed_incoterm) && (
                        <div className={`mt-1.5 flex flex-wrap gap-1.5 text-[10px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {m.proposed_price && <span className="rounded-full bg-black/10 px-2 py-0.5">Price: {formatMoney(m.proposed_price, m.proposed_currency ?? quotation.currency)}</span>}
                          {m.proposed_lead_time_days && <span className="rounded-full bg-black/10 px-2 py-0.5">Lead: {m.proposed_lead_time_days} d</span>}
                          {m.proposed_incoterm && <span className="rounded-full bg-black/10 px-2 py-0.5">Incoterm: {m.proposed_incoterm}</span>}
                        </div>
                      )}
                      <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleString()}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="border-t bg-background p-3">
          {isBuyer && quotation.status !== "accepted" && quotation.status !== "rejected" && (
            <div className="mb-2 flex gap-2">
              <Button size="sm" onClick={() => setStatus("accepted")}><CheckCircle2 className="mr-1 h-4 w-4" /> Accept</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus("rejected")}><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
            </div>
          )}
          <details className="mb-2 rounded-lg border bg-muted/30 p-2 text-xs">
            <summary className="cursor-pointer font-medium">Counter-propose (optional)</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Price</Label>
                <Input type="number" value={proposed.price ?? ""} onChange={(e) => setProposed((p) => ({ ...p, price: Number(e.target.value) || undefined }))} />
              </div>
              <div>
                <Label className="text-[10px]">Currency</Label>
                <Select value={proposed.currency ?? quotation.currency} onValueChange={(v) => setProposed((p) => ({ ...p, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Lead time (days)</Label>
                <Input type="number" value={proposed.leadTime ?? ""} onChange={(e) => setProposed((p) => ({ ...p, leadTime: Number(e.target.value) || undefined }))} />
              </div>
              <div>
                <Label className="text-[10px]">Incoterm</Label>
                <Select value={proposed.incoterm ?? quotation.incoterm} onValueChange={(v) => setProposed((p) => ({ ...p, incoterm: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INCOTERMS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </details>
          <div className="flex items-end gap-2">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Type a message…" />
            <Button onClick={send} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SubmitQuotationDialog({ state, onClose, onSubmitted }: { state: { open: boolean; rfqId?: string }; onClose: () => void; onSubmitted: () => void }) {
  const [rfqId, setRfqId] = useState(state.rfqId ?? "");
  const [rfqInfo, setRfqInfo] = useState<{ title: string; product_name: string; quantity: number; unit: string; currency: string } | null>(null);
  const [form, setForm] = useState({ unit_price: 0, currency: "USD", quantity: 0, incoterm: "FOB", lead_time_days: 21, validity_date: "", payment_terms: "30% deposit, 70% on B/L", notes: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRfqId(state.rfqId ?? "");
    setRfqInfo(null);
    if (state.rfqId) {
      void (async () => {
        try {
          const res = await getRfq({ data: { id: state.rfqId! } });
          if (res) {
            const r = res.rfq as { title: string; product_name: string; quantity: number; unit: string; currency: string };
            setRfqInfo(r);
            setForm((f) => ({ ...f, quantity: r.quantity, currency: r.currency }));
          }
        } catch { /* ignore */ }
      })();
    }
  }, [state.rfqId, state.open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfqId) { toast.error("Provide an RFQ ID"); return; }
    setBusy(true);
    try {
      await submitQuotation({
        data: {
          rfq_id: rfqId,
          unit_price: Number(form.unit_price),
          currency: form.currency,
          quantity: Number(form.quantity),
          incoterm: form.incoterm,
          lead_time_days: form.lead_time_days || undefined,
          validity_date: form.validity_date || undefined,
          payment_terms: form.payment_terms || undefined,
          notes: form.notes || undefined,
        },
      });
      toast.success("Quotation submitted");
      onSubmitted();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  if (!state.open) return null;

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Submit quotation</SheetTitle>
        </SheetHeader>
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          <div>
            <Label>RFQ ID</Label>
            <Input required value={rfqId} onChange={(e) => setRfqId(e.target.value)} placeholder="Paste RFQ id" />
            {rfqInfo && <div className="mt-1 text-xs text-muted-foreground">{rfqInfo.title} — {rfqInfo.product_name}</div>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unit price</Label>
              <Input type="number" required value={form.unit_price} onChange={(e) => setForm((f) => ({ ...f, unit_price: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" required value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Incoterm</Label>
              <Select value={form.incoterm} onValueChange={(v) => setForm((f) => ({ ...f, incoterm: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INCOTERMS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lead time (days)</Label>
              <Input type="number" value={form.lead_time_days} onChange={(e) => setForm((f) => ({ ...f, lead_time_days: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Valid until</Label>
              <Input type="date" value={form.validity_date} onChange={(e) => setForm((f) => ({ ...f, validity_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Payment terms</Label>
            <Input value={form.payment_terms} onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit quotation
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
