import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Plug, Zap, Shield, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/integrations")({ component: IntegrationsPage });

type Integration = {
  id: string; name: string; category: string; logo: string; description: string;
  status: "available" | "beta" | "coming_soon";
  features: string[];
};

const INTEGRATIONS: Integration[] = [
  { id: "sap", name: "SAP S/4HANA", category: "ERP", logo: "🟦", description: "Sync master data, sales orders, and financial postings with SAP S/4HANA via IDoc / OData.", status: "beta", features: ["Master data sync","Sales order push","Invoice posting","Multi-currency"] },
  { id: "oracle", name: "Oracle NetSuite", category: "ERP", logo: "🟥", description: "Bi-directional sync of items, customers, orders, and invoices via SuiteTalk REST.", status: "beta", features: ["Item & customer sync","Order fulfilment","Revenue recognition"] },
  { id: "dynamics", name: "Microsoft Dynamics 365", category: "ERP", logo: "🟪", description: "Push orders and receive fulfilment updates from D365 Finance & Supply Chain.", status: "available", features: ["OData sync","Purchase orders","Warehouse receipts"] },
  { id: "odoo", name: "Odoo", category: "ERP", logo: "🟩", description: "Sync products, contacts, and orders with Odoo Community or Enterprise.", status: "available", features: ["Product catalog","Contacts","Sales & purchase orders"] },
  { id: "quickbooks", name: "QuickBooks Online", category: "Accounting", logo: "🟢", description: "Post invoices, payments, and expenses to QuickBooks in real time.", status: "available", features: ["Invoice posting","Bank feeds","Multi-currency"] },
  { id: "xero", name: "Xero", category: "Accounting", logo: "🟦", description: "Full accounting sync — invoices, contacts, chart of accounts.", status: "available", features: ["Invoices","Contacts","Reports"] },
  { id: "shopify", name: "Shopify", category: "eCommerce", logo: "🛍️", description: "Publish agri products to your Shopify storefront with live stock updates.", status: "coming_soon", features: ["Product publish","Inventory sync"] },
  { id: "stripe", name: "Stripe Connect", category: "Payments", logo: "💳", description: "Escrow payments, multi-party splits, and international payouts.", status: "available", features: ["Escrow","Payouts","Multi-currency"] },
  { id: "flexport", name: "Flexport", category: "Logistics", logo: "🚢", description: "Get live freight quotes and track shipments through Flexport.", status: "beta", features: ["Freight quotes","Shipment tracking"] },
  { id: "maersk", name: "Maersk Spot", category: "Logistics", logo: "⚓", description: "Book ocean freight and receive schedule updates via Maersk APIs.", status: "beta", features: ["Booking","Schedules","Tracking"] },
];

const STATUS_STYLE: Record<Integration["status"], string> = {
  available: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  beta: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  coming_soon: "bg-muted text-muted-foreground border-border",
};

function IntegrationsPage() {
  const categories = Array.from(new Set(INTEGRATIONS.map((i) => i.category)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect Nova Pro to the ERP, accounting, logistics, and payment systems you already run."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Zap, title: "Real-time sync", body: "Bi-directional data flow keeps orders, stock, and invoices consistent across systems." },
          { icon: Shield, title: "Enterprise security", body: "OAuth 2.0, encrypted credentials, role-scoped access, and full audit trail." },
          { icon: Plug, title: "One-click connect", body: "Pre-built connectors — no custom middleware, no ETL to maintain." },
        ].map((f) => (
          <Card key={f.title} className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="flex gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><f.icon className="h-5 w-5" /></div>
              <div>
                <div className="font-semibold">{f.title}</div>
                <div className="text-xs text-muted-foreground">{f.body}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.map((cat) => (
        <section key={cat}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {INTEGRATIONS.filter((i) => i.category === cat).map((i) => (
              <Card key={i.id} className="group transition hover:border-primary/40 hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-muted text-2xl">{i.logo}</div>
                      <div>
                        <CardTitle className="text-base">{i.name}</CardTitle>
                        <div className="text-xs text-muted-foreground">{i.category}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_STYLE[i.status]}`}>
                      {i.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{i.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {i.features.map((f) => (
                      <span key={f} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {f}
                      </span>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant={i.status === "coming_soon" ? "outline" : "default"}
                    disabled={i.status === "coming_soon"}
                    onClick={() => toast.info(`${i.name}: connection wizard will open once your workspace admin adds API credentials.`)}
                    className="w-full"
                  >
                    {i.status === "coming_soon" ? "Notify me" : "Connect"} <ArrowRight className="ms-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
