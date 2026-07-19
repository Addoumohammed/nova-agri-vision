import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Plus, DollarSign, TrendingUp, PackageCheck, Clock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FilterChips } from "@/components/filter-chips";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { orders, currency, type Order } from "@/lib/demo-data";
import { useState } from "react";

export const Route = createFileRoute("/_app/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const [status, setStatus] = useState<"all" | Order["status"]>("all");
  const filtered = status === "all" ? orders : orders.filter((o) => o.status === status);
  const totalValue = orders.reduce((s, o) => s + o.total_usd, 0);
  const active = orders.filter((o) => ["pending", "confirmed", "shipped"].includes(o.status)).length;
  const delivered = orders.filter((o) => o.status === "delivered").length;

  const columns: Column<Order>[] = [
    { key: "id", header: "Order", render: (r) => <span className="font-mono text-xs font-semibold">{r.id}</span> },
    { key: "product", header: "Product", render: (r) => (
      <div>
        <div className="font-medium">{r.product_name}</div>
        <div className="text-xs text-muted-foreground">{r.quantity.toLocaleString()} {r.unit}</div>
      </div>
    )},
    { key: "buyer", header: "Buyer", hideOn: "md", render: (r) => r.buyer_id },
    { key: "created", header: "Created", hideOn: "sm", render: (r) => r.created_at },
    { key: "eta", header: "ETA", hideOn: "md", render: (r) => r.eta },
    { key: "total", header: "Total", render: (r) => <span className="font-semibold">{currency(r.total_usd)}</span>, sortable: true, accessor: (r) => r.total_usd },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Manage the full order lifecycle from RFQ to delivery"
        icon={ClipboardList}
        actions={<Button className="gap-1.5"><Plus className="h-4 w-4" /> New order</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total orders" value={orders.length.toString()} delta={9} icon={ClipboardList} />
        <StatCard label="Active" value={active.toString()} delta={4} icon={Clock} tint="info" />
        <StatCard label="Delivered" value={delivered.toString()} delta={12} icon={PackageCheck} tint="gold" />
        <StatCard label="GMV" value={currency(totalValue)} delta={14} icon={DollarSign} />
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        searchKeys={["id", "product_name", "buyer_id", "supplier_id"]}
        filters={
          <FilterChips
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "draft", label: "Draft" },
              { value: "pending", label: "Pending" },
              { value: "confirmed", label: "Confirmed" },
              { value: "shipped", label: "Shipped" },
              { value: "delivered", label: "Delivered" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        }
        toolbar={<div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground"><TrendingUp className="h-3 w-3" /> +14% this month</div>}
      />
    </div>
  );
}
