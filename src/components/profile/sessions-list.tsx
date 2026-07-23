import { Monitor, Smartphone, Trash2, LogOut, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessions, useRevokeSession, useRevokeOtherSessions } from "@/hooks/use-profile";
import { formatDistanceToNow } from "@/lib/format-date";

function parseUA(ua: string | null): { device: string; browser: string; Icon: typeof Monitor } {
  if (!ua) return { device: "Unknown device", browser: "", Icon: Monitor };
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  const isMac = /Mac OS X|Macintosh/i.test(ua);
  const isWin = /Windows/i.test(ua);
  const isLinux = /Linux/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const device = isIOS ? "iPhone / iPad" : isAndroid ? "Android device" : isMac ? "Mac" : isWin ? "Windows PC" : isLinux ? "Linux" : "Device";
  const browser = /Edg\//i.test(ua) ? "Edge" : /Chrome\//i.test(ua) ? "Chrome" : /Safari\//i.test(ua) ? "Safari" : /Firefox\//i.test(ua) ? "Firefox" : "Browser";
  const Icon = isMobile ? Smartphone : isMac || isWin || isLinux ? Laptop : Monitor;
  return { device, browser, Icon };
}

export function SessionsList() {
  const { data, isLoading, isError, error } = useSessions();
  const revoke = useRevokeSession();
  const revokeAll = useRevokeOtherSessions();
  const others = (data ?? []).filter((s) => !s.current).length;

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading sessions…</div>;
  }
  if (isError) {
    return <div className="text-sm text-destructive">Could not load sessions: {(error as Error).message}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {data?.length ?? 0} active session{(data?.length ?? 0) === 1 ? "" : "s"}
        </div>
        {others > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => revokeAll.mutate()}
            disabled={revokeAll.isPending}
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out other sessions
          </Button>
        )}
      </div>
      <ul className="space-y-2">
        {(data ?? []).map((s) => {
          const { device, browser, Icon } = parseUA(s.userAgent);
          return (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {device} · {browser}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {s.ip ?? "Unknown IP"} ·{" "}
                    {s.updatedAt ? `Active ${formatDistanceToNow(s.updatedAt)}` : "—"}
                  </div>
                </div>
              </div>
              {s.current ? (
                <span className="text-xs font-semibold text-emerald-500 shrink-0">Current</span>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-destructive"
                  onClick={() => revoke.mutate(s.id)}
                  disabled={revoke.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Revoke
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
