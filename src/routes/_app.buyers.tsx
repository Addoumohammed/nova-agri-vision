import { createFileRoute } from "@tanstack/react-router";
import { Building2, Star, ShieldCheck, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FilterChips } from "@/components/filter-chips";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { buyers, currency, type Buyer } from "@/lib/demo-data";
import { useState } from "react";

export const Route = createFileRoute("/_app/buyers")({
  component: BuyersPage,
});

function BuyersPage() {
  const [cat, setCat] = useState<"all" | "Fruits" | "Grains" | "Vegetables" | "Meat & Dairy" | "Spices" | "Beverages">("all");
  const filtered = cat === "all" ? buyers : buyers.filter((b) => b.category === cat);
  const totalSpend = buyers.reduce((s, b) => s + b.spend_usd, 0);

  const columns: Column<Buyer>[] = [
    { key: "company", header: "Buyer", render: (r) => (
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-gradient-gold grid place-items-center text-gold-foreground font-bold shrink-0">
          {r.company[0]}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">{r.company}</div>
          <div className="text-xs text-muted-foreground truncate">{r.contact}</div>
        </div>
      </div>
    )},
    { key: "country", header: "Country", render: (r) => r.country, sortable: true, accessor: (r) => r.country },
    { key: "category", header: "Focus", hideOn: "sm", render: (r) => <span className="px-2 py-0.5 rounded-md bg-muted text-xs">{r.category}</span> },
    { key: "rating", header: "Rating", hideOn: "sm", render: (r) => (
      <div className="inline-flex items-center gap-1 text-sm"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{r.rating}</div>
    )},
    { key: "orders", header: "Orders", hideOn: "md", render: (r) => r.orders.toLocaleString(), sortable: true, accessor: (r) => r.orders },
    { key: "spend", header: "Lifetime spend", render: (r) => <span className="font-semibold">{currency(r.spend_usd)}</span>, sortable: true, accessor: (r) => r.spend_usd },
    { key: "verified", header: "", render: (r) => r.verified ? <ShieldCheck className="h-4 w-4 text-emerald-400" /> : null },
  ];

  return (
    <div>
      <PageHeader
        title="Buyers"
        subtitle="Global importers and buyers sourcing through Nova Pro"
        icon={Building2}
        actions={<Button className="gap-1.5"><Plus className="h-4 w-4" /> Invite buyer</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total buyers" value={buyers.length.toString()} delta={6} icon={Building2} />
        <StatCard label="Verified" value={`${buyers.filter(b=>b.verified).length}/${buyers.length}`} delta={3} icon={ShieldCheck} tint="gold" />
        <StatCard label="Lifetime spend" value={currency(totalSpend)} delta={18} icon={Building2} tint="info" />
        <StatCard label="Avg rating" value={(buyers.reduce((s,b)=>s+b.rating,0)/buyers.length).toFixed(1)} delta={1} icon={Star} tint="gold" />
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        searchKeys={["company", "country", "category", "contact"]}
        filters={
          <FilterChips
            value={cat}
            onChange={setCat}
            options={[
              { value: "all", label: "All" },
              { value: "Fruits", label: "Fruits" },
              { value: "Grains", label: "Grains" },
              { value: "Vegetables", label: "Vegetables" },
              { value: "Meat & Dairy", label: "Meat & Dairy" },
              { value: "Spices", label: "Spices" },
              { value: "Beverages", label: "Beverages" },
            ]}
          />
        }
      />
    </div>
  );
}
