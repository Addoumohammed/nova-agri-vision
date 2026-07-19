import { createFileRoute } from "@tanstack/react-router";
import { FileText, Download, Send, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FilterChips } from "@/components/filter-chips";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { invoices, currency, type Invoice } from "@/lib/demo-data";
import { useState } from "react";

export const Route = createFileRoute("/_app/invoices")({
  component: InvoicesPage,
});

function InvoicesPage() {
  const [status, setStatus] = useState<"all" | Invoice["status"]>("all");
  const filtered = status === "all" ? invoices : invoices.filter((i) => i.status === status);
  const total = invoices.reduce((s, i) => s + i.amount_usd, 0);
  const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount_usd, 0);
  const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount_usd, 0);
  const pending = total - paid;

  const columns: Column<Invoice>[] = [
    { key: "id", header: "Invoice", render: (r) => <span className="font-mono text-xs font-semibold">{r.id}</span> },
    { key: "buyer", header: "Buyer", render: (r) => r.buyer },
    { key: "supplier", header: "Supplier", hideOn: "md", render: (r) => r.supplier },
    { key: "order", header: "Order", hideOn: "sm", render: (r) => <span className="font-mono text-xs">{r.order_id}</span> },
    { key: "issued", header: "Issued", hideOn: "md", render: (r) => r.issued_at },
    { key: "due", header: "Due", hideOn: "sm", render: (r) => r.due_at },
    { key: "amount", header: "Amount", render: (r) => <span className="font-semibold">{currency(r.amount_usd)}</span>, sortable: true, accessor: (r) => r.amount_usd },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "actions", header: "", render: () => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8"><Send className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-3.5 w-3.5" /></Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Billing, payments and reconciliation"
        icon={FileText}
        actions={<Button className="gap-1.5">New invoice</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total billed" value={currency(total)} delta={11} icon={DollarSign} />
        <StatCard label="Paid" value={currency(paid)} delta={16} icon={CheckCircle2} tint="gold" />
        <StatCard label="Outstanding" value={currency(pending)} delta={-4} icon={FileText} tint="info" />
        <StatCard label="Overdue" value={currency(overdue)} delta={-8} icon={AlertCircle} tint="danger" />
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        searchKeys={["id", "buyer", "supplier", "order_id"]}
        filters={
          <FilterChips
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "draft", label: "Draft" },
              { value: "sent", label: "Sent" },
              { value: "paid", label: "Paid" },
              { value: "overdue", label: "Overdue" },
            ]}
          />
        }
      />
    </div>
  );
}
