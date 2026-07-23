import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bell, CheckCheck, Trash2, Filter, Send, Loader2, Check, RotateCcw, Package, Ship, FileText, MessageSquare, Bot, CloudSun, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useNotifications, useNotificationMutations, useNotificationsRealtime,
} from "@/hooks/use-notifications";
import type { NotificationKind, NotificationRow } from "@/lib/notifications.functions";
import { NOTIFICATION_KINDS } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});

const KIND_META: Record<NotificationKind, { icon: React.ComponentType<{ className?: string }>; label: string; tone: string }> = {
  system:   { icon: Bell,           label: "System",   tone: "bg-slate-500/10 text-slate-600" },
  order:    { icon: Package,        label: "Orders",   tone: "bg-blue-500/10 text-blue-600" },
  shipment: { icon: Ship,           label: "Shipments",tone: "bg-cyan-500/10 text-cyan-600" },
  invoice:  { icon: FileText,       label: "Invoices", tone: "bg-emerald-500/10 text-emerald-600" },
  message:  { icon: MessageSquare,  label: "Messages", tone: "bg-violet-500/10 text-violet-600" },
  ai:       { icon: Bot,            label: "Nova AI",  tone: "bg-primary/10 text-primary" },
  weather:  { icon: CloudSun,       label: "Weather",  tone: "bg-amber-500/10 text-amber-600" },
  market:   { icon: TrendingUp,     label: "Market",   tone: "bg-rose-500/10 text-rose-600" },
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function NotificationsPage() {
  useNotificationsRealtime();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [kind, setKind] = useState<NotificationKind | "all">("all");
  const [search, setSearch] = useState("");

  const list = useNotifications(tab, kind);
  const m = useNotificationMutations();

  const rows = useMemo(() => {
    const all = list.data ?? [];
    if (!search.trim()) return all;
    const q = search.trim().toLowerCase();
    return all.filter((n) => n.title.toLowerCase().includes(q) || (n.body ?? "").toLowerCase().includes(q));
  }, [list.data, search]);

  const unreadCount = (list.data ?? []).filter((n) => !n.read_at).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Real-time updates across your workspace"
        icon={Bell}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              disabled={unreadCount === 0 || m.markAllRead.isPending}
              onClick={() => m.markAllRead.mutate()}
            >
              <CheckCheck className="h-4 w-4 me-1.5" /> Mark all read
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={m.clearAll.isPending || (list.data ?? []).length === 0}
              onClick={() => {
                if (confirm("Delete all read notifications?")) m.clearAll.mutate({ onlyRead: true });
              }}
            >
              <Trash2 className="h-4 w-4 me-1.5" /> Clear read
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Inbox */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">
                  Unread {unreadCount > 0 && <span className="ms-1.5 text-[10px] font-bold px-1.5 rounded bg-primary/20 text-primary">{unreadCount}</span>}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2 ms-auto">
              <Select value={kind} onValueChange={(v) => setKind(v as NotificationKind | "all")}>
                <SelectTrigger className="w-[160px] h-9">
                  <Filter className="h-3.5 w-3.5 me-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {NOTIFICATION_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>{KIND_META[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[180px] h-9"
              />
              <Button
                variant="ghost" size="icon" className="h-9 w-9"
                onClick={() => list.refetch()}
                aria-label="Refresh"
                disabled={list.isFetching}
              >
                {list.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {list.isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading notifications…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-16 text-center">
              <Bell className="h-10 w-10 mx-auto opacity-30 mb-3" />
              <div className="font-medium">No notifications</div>
              <div className="text-sm text-muted-foreground mt-1">
                {tab === "unread" ? "You're all caught up." : "Nothing here yet — trigger a test on the right."}
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((n) => (
                <InboxRow
                  key={n.id}
                  n={n}
                  onRead={() => m.markRead.mutate({ id: n.id })}
                  onUnread={() => m.markUnread.mutate({ id: n.id })}
                  onDelete={() => m.remove.mutate({ id: n.id })}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          <TestNotificationCard />
          <StatsCard rows={list.data ?? []} />
        </div>
      </div>
    </div>
  );
}

function InboxRow({
  n, onRead, onUnread, onDelete,
}: {
  n: NotificationRow;
  onRead: () => void;
  onUnread: () => void;
  onDelete: () => void;
}) {
  const meta = KIND_META[n.kind];
  const Icon = meta.icon;
  const isUnread = !n.read_at;
  return (
    <li className={cn("p-4 flex gap-3 items-start hover:bg-muted/40 transition-colors", isUnread && "bg-primary/5")}>
      <div className={cn("h-9 w-9 shrink-0 rounded-xl grid place-items-center", meta.tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{n.title}</span>
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", meta.tone)}>{meta.label}</span>
              {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Unread" />}
            </div>
            {n.body && <div className="text-sm text-muted-foreground mt-1">{n.body}</div>}
            <div className="text-[11px] text-muted-foreground mt-1.5">{formatWhen(n.created_at)}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isUnread ? (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onRead}>
                <Check className="h-3.5 w-3.5 me-1" /> Read
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onUnread}>
                Unread
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-600" onClick={onDelete} aria-label="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

function TestNotificationCard() {
  const m = useNotificationMutations();
  const [title, setTitle] = useState("Test notification");
  const [body, setBody] = useState("This confirms your in-app delivery pipeline works.");
  const [kind, setKind] = useState<NotificationKind>("system");
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display font-bold mb-1">Send test notification</h3>
      <p className="text-xs text-muted-foreground mb-4">Verifies realtime delivery to your inbox.</p>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Body</Label>
          <Input value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Category</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as NotificationKind)}>
            <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {NOTIFICATION_KINDS.map((k) => <SelectItem key={k} value={k}>{KIND_META[k].label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm" className="w-full"
          disabled={!title.trim() || m.createSelf.isPending}
          onClick={() => m.createSelf.mutate({ title: title.trim(), body: body.trim() || undefined, kind })}
        >
          {m.createSelf.isPending ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Send className="h-4 w-4 me-1.5" />}
          Send test
        </Button>
      </div>
    </div>
  );
}

function StatsCard({ rows }: { rows: NotificationRow[] }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = { total: rows.length, unread: 0 };
    for (const r of rows) if (!r.read_at) c.unread++;
    for (const k of NOTIFICATION_KINDS) c[k] = rows.filter((n) => n.kind === k).length;
    return c;
  }, [rows]);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display font-bold mb-4">Summary</h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Stat label="Total" value={counts.total} />
        <Stat label="Unread" value={counts.unread} accent />
      </div>
      <div className="space-y-2">
        {NOTIFICATION_KINDS.filter((k) => counts[k] > 0).map((k) => {
          const meta = KIND_META[k];
          const Icon = meta.icon;
          return (
            <div key={k} className="flex items-center gap-2 text-sm">
              <div className={cn("h-6 w-6 rounded-md grid place-items-center", meta.tone)}>
                <Icon className="h-3 w-3" />
              </div>
              <span className="text-muted-foreground">{meta.label}</span>
              <span className="ms-auto font-semibold">{counts[k]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl p-3 border", accent ? "border-primary/30 bg-primary/5" : "border-border")}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-2xl font-display font-bold mt-0.5", accent && "text-primary")}>{value}</div>
    </div>
  );
}
