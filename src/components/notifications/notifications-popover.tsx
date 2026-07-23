import { Link } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, Loader2, Trash2, Package, Ship, FileText, MessageSquare, Bot, CloudSun, TrendingUp, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotifications, useUnreadCount, useNotificationMutations, useNotificationsRealtime } from "@/hooks/use-notifications";
import type { NotificationKind, NotificationRow } from "@/lib/notifications.functions";
import { useState } from "react";

function kindIcon(kind: NotificationKind) {
  const cls = "h-4 w-4";
  switch (kind) {
    case "order": return <Package className={cls} />;
    case "shipment": return <Ship className={cls} />;
    case "invoice": return <FileText className={cls} />;
    case "message": return <MessageSquare className={cls} />;
    case "ai": return <Bot className={cls} />;
    case "weather": return <CloudSun className={cls} />;
    case "market": return <TrendingUp className={cls} />;
    default: return <Bell className={cls} />;
  }
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  useNotificationsRealtime();
  const unread = useUnreadCount();
  const list = useNotifications("all", "all");
  const m = useNotificationMutations();

  const items = (list.data ?? []).slice(0, 8);
  const badge = unread.data ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications, ${badge} unread`} className="relative">
          <Bell className="h-4 w-4" />
          {badge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">Notifications</div>
            {badge > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600">
                {badge} new
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={badge === 0 || m.markAllRead.isPending}
            onClick={() => m.markAllRead.mutate()}
          >
            <CheckCheck className="h-3.5 w-3.5 me-1" /> Mark all read
          </Button>
        </div>

        <ScrollArea className="max-h-96">
          {list.isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
              You're all caught up.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <NotificationRowItem
                  key={n.id}
                  n={n}
                  onRead={(id) => m.markRead.mutate({ id })}
                  onDelete={(id) => m.remove.mutate({ id })}
                />
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between px-3 py-2 border-t border-border">
          <Link to="/settings" onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <Settings2 className="h-3.5 w-3.5" /> Preferences
          </Link>
          <Link to="/notifications" onClick={() => setOpen(false)} className="text-xs font-medium text-primary hover:underline">
            View all →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRowItem({
  n, onRead, onDelete,
}: { n: NotificationRow; onRead: (id: string) => void; onDelete: (id: string) => void }) {
  const isUnread = !n.read_at;
  return (
    <li className={cn("group px-4 py-3 flex gap-3 hover:bg-muted/50 transition-colors", isUnread && "bg-primary/5")}>
      <div className={cn("h-8 w-8 shrink-0 rounded-lg grid place-items-center",
        isUnread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
        {kindIcon(n.kind)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-medium truncate">{n.title}</div>
          <div className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.created_at)}</div>
        </div>
        {n.body && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div>}
        <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {isUnread && (
            <button onClick={() => onRead(n.id)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <Check className="h-3 w-3" /> Mark read
            </button>
          )}
          <button onClick={() => onDelete(n.id)} className="text-[10px] text-muted-foreground hover:text-rose-600 inline-flex items-center gap-1 ms-auto">
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      </div>
      {isUnread && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" aria-label="Unread" />}
    </li>
  );
}
