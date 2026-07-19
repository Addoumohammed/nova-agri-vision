import { createFileRoute } from "@tanstack/react-router";
import { Users, Star, ShieldCheck, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FilterChips } from "@/components/filter-chips";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { suppliers, currency, type Supplier } from "@/lib/demo-data";
import { useState } from "react";

export const Route = createFileRoute("/_app/suppliers")({
  component: SuppliersPage,
});

function SuppliersPage() {
  const [cat, setCat] = useState<"all" | "Fruits" | "Grains" | "Beverages" | "Spices" | "Oils">("all");
  const filtered = cat === "all" ? suppliers : suppliers.filter((s) => s.category === cat);
  const totalVolume = suppliers.reduce((s, x) => s + x.volume_usd, 0);
  const verified = suppliers.filter((s) => s.verified).length;

  const columns: Column<Supplier>[] = [
    { key: "company", header: "Supplier", render: (r) => (
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center text-primary-foreground font-bold shrink-0">
          {r.company[0]}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">{r.company}</div>
          <div className="text-xs text-muted-foreground truncate">{r.contact}</div>
        </div>
      </div>
    )},
    { key: "country", header: "Country", render: (r) => r.country, sortable: true, accessor: (r) => r.country },
    { key: "category", header: "Category", hideOn: "sm", render: (r) => (
      <span className="px-2 py-0.5 rounded-md bg-muted text-xs">{r.category}</span>
    )},
    { key: "rating", header: "Rating", hideOn: "sm", render: (r) => (
      <div className="inline-flex items-center gap-1 text-sm"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{r.rating}</div>
    ), sortable: true, accessor: (r) => r.rating },
    { key: "orders", header: "Orders", hideOn: "md", render: (r) => r.orders.toLocaleString(), sortable: true, accessor: (r) => r.orders },
    { key: "volume", header: "Volume", render: (r) => <span className="font-semibold">{currency(r.volume_usd)}</span>, sortable: true, accessor: (r) => r.volume_usd },
    { key: "lead", header: "Lead time", hideOn: "md", render: (r) => `${r.lead_time_days}d` },
    { key: "verified", header: "", render: (r) => r.verified ? <ShieldCheck className="h-4 w-4 text-emerald-400" /> : null },
  ];

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle="Verified network of agricultural producers and exporters"
        icon={Users}
        actions={<Button className="gap-1.5"><Plus className="h-4 w-4" /> Add supplier</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total suppliers" value={suppliers.length.toString()} delta={8} icon={Users} />
        <StatCard label="Verified" value={`${verified}/${suppliers.length}`} delta={4} icon={ShieldCheck} tint="gold" />
        <StatCard label="Total volume" value={currency(totalVolume)} delta={12} icon={Users} tint="info" />
        <StatCard label="Avg rating" value={(suppliers.reduce((s, x) => s + x.rating, 0) / suppliers.length).toFixed(1)} delta={2} icon={Star} tint="gold" />
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
              { value: "Beverages", label: "Beverages" },
              { value: "Spices", label: "Spices" },
              { value: "Oils", label: "Oils" },
            ]}
          />
        }
      />
    </div>
  );
}
