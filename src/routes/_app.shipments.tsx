import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Ship, Plane, Truck, MapPin, Package } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FilterChips } from "@/components/filter-chips";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { shipments, currency, type Shipment } from "@/lib/demo-data";
import { useState, lazy, Suspense } from "react";

const NovaMap = lazy(() => import("@/components/nova-map"));

export const Route = createFileRoute("/_app/shipments")({
  component: ShipmentsPage,
});

function ShipmentsPage() {
  const [mode, setMode] = useState<"all" | Shipment["mode"]>("all");
  const filtered = mode === "all" ? shipments : shipments.filter((s) => s.mode === mode);
  const inTransit = shipments.filter((s) => s.status === "in_transit").length;
  const delayed = shipments.filter((s) => s.status === "delayed").length;
  const value = shipments.reduce((s, x) => s + x.value_usd, 0);

  const modeIcon = (m: Shipment["mode"]) =>
    m === "sea" ? <Ship className="h-3.5 w-3.5" /> : m === "air" ? <Plane className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />;

  const columns: Column<Shipment>[] = [
    { key: "id", header: "Shipment", render: (r) => (
      <div>
        <div className="font-mono text-xs font-semibold">{r.id}</div>
        <div className="text-[10px] text-muted-foreground">{r.order_id}</div>
      </div>
    )},
    { key: "route", header: "Route", render: (r) => (
      <div className="flex items-center gap-2 min-w-0">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="truncate">{r.origin} → {r.destination}</span>
      </div>
    )},
    { key: "mode", header: "Mode", hideOn: "sm", render: (r) => (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-xs capitalize">
        {modeIcon(r.mode)} {r.mode}
      </span>
    )},
    { key: "carrier", header: "Carrier", hideOn: "md", render: (r) => r.carrier },
    { key: "progress", header: "Progress", hideOn: "sm", render: (r) => (
      <div className="w-32">
        <Progress value={r.progress} className="h-1.5" />
        <div className="text-[10px] mt-1 text-muted-foreground">{r.progress}% · ETA {r.eta}</div>
      </div>
    )},
    { key: "value", header: "Value", render: (r) => <span className="font-semibold">{currency(r.value_usd)}</span>, sortable: true, accessor: (r) => r.value_usd },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Shipments"
        subtitle="Live tracking across sea, air and land"
        icon={Ship}
        actions={<Button className="gap-1.5">New shipment</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active" value={shipments.length.toString()} delta={5} icon={Package} />
        <StatCard label="In transit" value={inTransit.toString()} delta={7} icon={Ship} tint="info" />
        <StatCard label="Delayed" value={delayed.toString()} delta={-1} icon={Truck} tint="danger" />
        <StatCard label="Cargo value" value={currency(value)} delta={12} icon={Package} tint="gold" />
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        searchKeys={["id", "order_id", "origin", "destination", "carrier"]}
        filters={
          <FilterChips
            value={mode}
            onChange={setMode}
            options={[
              { value: "all", label: "All" },
              { value: "sea", label: "Sea" },
              { value: "air", label: "Air" },
              { value: "land", label: "Land" },
            ]}
          />
        }
      />
    </div>
  );
}
