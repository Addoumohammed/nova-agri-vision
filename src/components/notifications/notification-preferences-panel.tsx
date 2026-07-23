import { useEffect, useState } from "react";
import { Loader2, Bell, Mail, Smartphone, MonitorSmartphone, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePreferences } from "@/hooks/use-notifications";
import {
  DEFAULT_PREFERENCES, NOTIFICATION_KINDS,
  type NotificationKind, type NotificationChannel, type NotificationPreferences,
} from "@/lib/notifications.functions";

const KIND_LABELS: Record<NotificationKind, string> = {
  system: "System alerts",
  order: "Orders",
  shipment: "Shipments",
  invoice: "Invoices",
  message: "Messages",
  ai: "Nova AI insights",
  weather: "Weather risk",
  market: "Market movements",
};

const CHANNEL_META: Record<NotificationChannel, { label: string; desc: string; icon: React.ComponentType<{ className?: string }> }> = {
  in_app: { label: "In-app", desc: "Bell menu & inbox", icon: Bell },
  email:  { label: "Email",  desc: "To your account address", icon: Mail },
  push:   { label: "Push",   desc: "Browser & mobile push", icon: MonitorSmartphone },
  sms:    { label: "SMS",    desc: "Critical alerts by text", icon: Smartphone },
};

export function NotificationPreferencesPanel() {
  const q = usePreferences();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (q.data) { setPrefs(q.data); setDirty(false); }
  }, [q.data]);

  const update = (patch: Partial<NotificationPreferences>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    setDirty(true);
  };

  if (q.isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading preferences…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Channels */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display font-bold">Delivery channels</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Choose how you want to be reached.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(CHANNEL_META) as NotificationChannel[]).map((c) => {
            const meta = CHANNEL_META[c];
            const Icon = meta.icon;
            const enabled = prefs.channels[c];
            return (
              <label key={c} className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer">
                <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center text-muted-foreground shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm">{meta.label}</div>
                  <div className="text-xs text-muted-foreground">{meta.desc}</div>
                  {(c === "email" || c === "push" || c === "sms") && enabled && (
                    <div className="text-[10px] text-amber-600 mt-1">
                      Provider connection required — configure in Integrations.
                    </div>
                  )}
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => update({ channels: { ...prefs.channels, [c]: v } })}
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Categories */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div>
          <h3 className="font-display font-bold">Categories</h3>
          <p className="text-sm text-muted-foreground">Toggle which events generate notifications.</p>
        </div>
        {NOTIFICATION_KINDS.map((k, i) => (
          <div key={k}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-sm">{KIND_LABELS[k]}</div>
                <div className="text-xs text-muted-foreground capitalize">{k}</div>
              </div>
              <Switch
                checked={prefs.kinds[k]}
                onCheckedChange={(v) => update({ kinds: { ...prefs.kinds, [k]: v } })}
              />
            </div>
            {i < NOTIFICATION_KINDS.length - 1 && <Separator className="mt-5" />}
          </div>
        ))}
      </div>

      {/* Delivery cadence & quiet hours */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h3 className="font-display font-bold">Cadence & quiet hours</h3>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-sm">Delivery frequency</div>
            <div className="text-xs text-muted-foreground">How often we batch email digests.</div>
          </div>
          <Select
            value={prefs.digestFrequency}
            onValueChange={(v) => update({ digestFrequency: v as NotificationPreferences["digestFrequency"] })}
          >
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant</SelectItem>
              <SelectItem value="hourly">Hourly digest</SelectItem>
              <SelectItem value="daily">Daily digest</SelectItem>
              <SelectItem value="off">Off</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-sm">Quiet hours</div>
            <div className="text-xs text-muted-foreground">Suppress push & SMS during these hours.</div>
          </div>
          <Switch
            checked={prefs.quietHours.enabled}
            onCheckedChange={(v) => update({ quietHours: { ...prefs.quietHours, enabled: v } })}
          />
        </div>
        {prefs.quietHours.enabled && (
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div>
              <Label className="text-xs">From</Label>
              <Input
                type="time" className="mt-1 h-9"
                value={prefs.quietHours.start}
                onChange={(e) => update({ quietHours: { ...prefs.quietHours, start: e.target.value } })}
              />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input
                type="time" className="mt-1 h-9"
                value={prefs.quietHours.end}
                onChange={(e) => update({ quietHours: { ...prefs.quietHours, end: e.target.value } })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10">
        <div className="rounded-xl border border-border bg-card/95 backdrop-blur p-3 flex items-center justify-between shadow-sm">
          <div className="text-xs text-muted-foreground">
            {dirty ? "You have unsaved changes." : "All changes saved."}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              disabled={!dirty}
              onClick={() => { setPrefs(q.data ?? DEFAULT_PREFERENCES); setDirty(false); }}
            >
              <RotateCcw className="h-4 w-4 me-1.5" /> Reset
            </Button>
            <Button
              size="sm"
              disabled={!dirty || q.save.isPending}
              onClick={() => q.save.mutate(prefs, { onSuccess: () => setDirty(false) })}
            >
              {q.save.isPending ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Save className="h-4 w-4 me-1.5" />}
              Save preferences
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
