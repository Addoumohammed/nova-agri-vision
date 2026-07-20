import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft, Ship, FileCheck, Globe2, Loader2, Info, Truck, Plane, Anchor,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { listCountryRegulations } from "@/lib/trade.functions";
import {
  CURRENCIES, useExchangeRates, convertCurrency, formatMoney,
  estimateShippingCost, type ShipMode,
} from "@/lib/currency";

export const Route = createFileRoute("/_app/trade-tools")({ component: TradeToolsPage });

function TradeToolsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Trade Tools"
        subtitle="Live FX rates, shipping estimator, customs requirements, and country regulations."
      />
      <Tabs defaultValue="currency">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="currency"><ArrowRightLeft className="mr-2 h-4 w-4" /> Currency</TabsTrigger>
          <TabsTrigger value="shipping"><Ship className="mr-2 h-4 w-4" /> Shipping</TabsTrigger>
          <TabsTrigger value="customs"><FileCheck className="mr-2 h-4 w-4" /> Customs</TabsTrigger>
          <TabsTrigger value="regulations"><Globe2 className="mr-2 h-4 w-4" /> Regulations</TabsTrigger>
        </TabsList>
        <TabsContent value="currency" className="mt-4"><CurrencyConverter /></TabsContent>
        <TabsContent value="shipping" className="mt-4"><ShippingEstimator /></TabsContent>
        <TabsContent value="customs" className="mt-4"><CustomsBrowser /></TabsContent>
        <TabsContent value="regulations" className="mt-4"><CountryBrowser /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============ Currency ============
function CurrencyConverter() {
  const { rates, loading, error } = useExchangeRates();
  const [amount, setAmount] = useState(1000);
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");

  const converted = useMemo(() => rates ? convertCurrency(amount, from, to, rates) : 0, [amount, from, to, rates]);

  return (
    <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
      <Card>
        <CardHeader><CardTitle className="text-base">Live conversion</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading rates…</div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : (
            <>
              <div>
                <Label>Amount</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <div>
                  <Label>From</Label>
                  <Select value={from} onValueChange={setFrom}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <button type="button" onClick={() => { setFrom(to); setTo(from); }} className="mb-1 rounded-lg border p-2 hover:bg-muted" aria-label="Swap">
                  <ArrowRightLeft className="h-4 w-4" />
                </button>
                <div>
                  <Label>To</Label>
                  <Select value={to} onValueChange={setTo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-primary/10 to-emerald-500/10 p-4">
                <div className="text-xs text-muted-foreground">Converted</div>
                <div className="text-2xl font-bold">{formatMoney(converted, to)}</div>
                <div className="mt-1 text-xs text-muted-foreground">Rates via European Central Bank</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">USD reference table</CardTitle></CardHeader>
        <CardContent>
          {rates ? (
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
              {CURRENCIES.filter((c) => c.code !== "USD").map((c) => (
                <div key={c.code} className="rounded-lg border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">{c.name}</div>
                  <div className="font-semibold">1 USD = {rates[c.code]?.toFixed(4) ?? "—"} {c.code}</div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Shipping ============
function ShippingEstimator() {
  const [mode, setMode] = useState<ShipMode>("sea_fcl_40");
  const [weight, setWeight] = useState(20000);
  const [volume, setVolume] = useState(60);
  const [distance, setDistance] = useState(5000);
  const est = estimateShippingCost({ mode, weight_kg: weight, volume_cbm: volume, distance_km: distance });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Shipping estimator</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as ShipMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sea_fcl_20"><Anchor className="mr-2 inline h-4 w-4" /> Sea — FCL 20ft</SelectItem>
                <SelectItem value="sea_fcl_40"><Anchor className="mr-2 inline h-4 w-4" /> Sea — FCL 40ft</SelectItem>
                <SelectItem value="sea_lcl"><Ship className="mr-2 inline h-4 w-4" /> Sea — LCL</SelectItem>
                <SelectItem value="air"><Plane className="mr-2 inline h-4 w-4" /> Air freight</SelectItem>
                <SelectItem value="truck"><Truck className="mr-2 inline h-4 w-4" /> Truck / land</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Weight (kg)</Label><Input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} /></div>
            <div><Label>Volume (CBM)</Label><Input type="number" value={volume} onChange={(e) => setVolume(Number(e.target.value))} /></div>
            <div className="col-span-2"><Label>Distance (km)</Label><Input type="number" value={distance} onChange={(e) => setDistance(Number(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Estimated cost</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 to-primary/15 p-6">
            <div className="text-xs text-muted-foreground">All-in freight (indicative)</div>
            <div className="text-3xl font-bold">{formatMoney(est.cost_usd, "USD")}</div>
            <div className="mt-2 text-sm text-muted-foreground">Transit: <span className="font-semibold text-foreground">{est.transit_days} days</span></div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground"><Info className="h-3 w-3" /> Breakdown</div>
            <div className="mt-1 font-mono">{est.breakdown}</div>
          </div>
          <p className="text-xs text-muted-foreground">
            Indicative benchmark based on published freight rate averages. Actual quotes depend on route, fuel surcharges (BAF), currency adjustment (CAF), and container availability.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Customs / Regulations ============
type RegRow = {
  id: string; country_code: string; country_name: string; product_category: string;
  import_tariff_pct: number | null; vat_pct: number | null; restrictions: string | null;
  required_docs: string[]; notes: string | null;
};

function useRegulations() {
  const [rows, setRows] = useState<RegRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void (async () => {
      try {
        const data = await listCountryRegulations();
        setRows(data as RegRow[]);
      } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
    })();
  }, []);
  return { rows, loading };
}

function CustomsBrowser() {
  const { rows, loading } = useRegulations();
  const [country, setCountry] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [orderValue, setOrderValue] = useState(50000);

  const countries = useMemo(() => Array.from(new Set(rows.map((r) => r.country_code))).sort(), [rows]);
  const categories = useMemo(() => Array.from(new Set(rows.filter((r) => !country || r.country_code === country).map((r) => r.product_category))), [rows, country]);
  const match = rows.find((r) => r.country_code === country && r.product_category === category);

  const tariff = match?.import_tariff_pct ? (orderValue * match.import_tariff_pct) / 100 : 0;
  const vat = match?.vat_pct ? ((orderValue + tariff) * match.vat_pct) / 100 : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
      <Card>
        <CardHeader><CardTitle className="text-base">Customs calculator</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : (
            <>
              <div>
                <Label>Destination country</Label>
                <Select value={country} onValueChange={(v) => { setCountry(v); setCategory(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>{countries.map((c) => {
                    const name = rows.find((r) => r.country_code === c)?.country_name ?? c;
                    return <SelectItem key={c} value={c}>{name} ({c})</SelectItem>;
                  })}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Product category</Label>
                <Select value={category} onValueChange={setCategory} disabled={!country}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Order value (USD)</Label>
                <Input type="number" value={orderValue} onChange={(e) => setOrderValue(Number(e.target.value))} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{match ? `${match.country_name} — ${match.product_category}` : "Select country & category"}</CardTitle></CardHeader>
        <CardContent>
          {match ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Import tariff" value={`${match.import_tariff_pct ?? 0}%`} sub={formatMoney(tariff, "USD")} />
                <Stat label="VAT / GST" value={`${match.vat_pct ?? 0}%`} sub={formatMoney(vat, "USD")} />
                <Stat label="Landed cost" value={formatMoney(orderValue + tariff + vat, "USD")} sub="Estimated" />
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Required documents</div>
                <div className="flex flex-wrap gap-1.5">
                  {match.required_docs.map((d) => <Badge key={d} variant="outline">{d}</Badge>)}
                </div>
              </div>
              {match.restrictions && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                  <div className="mb-1 text-xs font-semibold uppercase text-amber-700 dark:text-amber-400">Restrictions</div>
                  {match.restrictions}
                </div>
              )}
              {match.notes && <p className="text-sm text-muted-foreground">{match.notes}</p>}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">Pick a country and product category to see tariffs, VAT, and required documents.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function CountryBrowser() {
  const { rows, loading } = useRegulations();
  const grouped = useMemo(() => {
    const map = new Map<string, RegRow[]>();
    for (const r of rows) {
      if (!map.has(r.country_code)) map.set(r.country_code, []);
      map.get(r.country_code)!.push(r);
    }
    return Array.from(map.entries());
  }, [rows]);

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {grouped.map(([code, entries]) => (
        <Card key={code}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span>{entries[0].country_name}</span>
              <Badge variant="outline">{code}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {entries.map((e) => (
              <div key={e.id} className="rounded-lg border bg-muted/20 p-2 text-xs">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium">{e.product_category}</span>
                  <span className="text-muted-foreground">Tariff {e.import_tariff_pct ?? 0}% • VAT {e.vat_pct ?? 0}%</span>
                </div>
                {e.notes && <div className="text-muted-foreground">{e.notes}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
