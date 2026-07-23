import { useEffect, useState } from "react";
import { Shield, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { usePrivacyPrefs, useSavePrivacy, useRequestDataExport } from "@/hooks/use-profile";
import { DEFAULT_PRIVACY, type PrivacyPreferences } from "@/lib/profile/types";

export function PrivacyPanel() {
  const q = usePrivacyPrefs();
  const save = useSavePrivacy();
  const exportReq = useRequestDataExport();
  const [prefs, setPrefs] = useState<PrivacyPreferences>(DEFAULT_PRIVACY);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (q.data) {
      setPrefs(q.data);
      setDirty(false);
    }
  }, [q.data]);

  function update<K extends keyof PrivacyPreferences>(k: K, v: PrivacyPreferences[K]) {
    setPrefs((p) => ({ ...p, [k]: v }));
    setDirty(true);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="font-display font-bold">Privacy</h3>
      </div>

      <div className="space-y-2">
        <Label>Profile visibility</Label>
        <Select
          value={prefs.profileVisibility}
          onValueChange={(v) => update("profileVisibility", v as PrivacyPreferences["profileVisibility"])}
        >
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public — visible to anyone</SelectItem>
            <SelectItem value="workspace">Workspace — teammates only</SelectItem>
            <SelectItem value="private">Private — only me</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <Row label="Show email on profile" desc="Other users can see your email">
        <Switch checked={prefs.showEmail} onCheckedChange={(v) => update("showEmail", v)} />
      </Row>
      <Row label="Product analytics" desc="Anonymous usage data helps us improve Nova Pro">
        <Switch checked={prefs.analyticsOptIn} onCheckedChange={(v) => update("analyticsOptIn", v)} />
      </Row>
      <Row label="Marketing emails" desc="Occasional news, product updates and offers">
        <Switch checked={prefs.marketingEmails} onCheckedChange={(v) => update("marketingEmails", v)} />
      </Row>

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Export my data</div>
          <div className="text-xs text-muted-foreground">Receive a machine-readable copy by email</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => exportReq.mutate()}
          disabled={exportReq.isPending}
        >
          <Download className="h-3.5 w-3.5" /> Request export
        </Button>
      </div>

      <div className="flex justify-end">
        <Button
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate(prefs)}
        >
          Save changes
        </Button>
      </div>
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
