import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon, Bell, Shield, CreditCard, Users, Globe2, Palette } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RoleSwitcher } from "@/components/role-switcher";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { NotificationPreferencesPanel } from "@/components/notifications/notification-preferences-panel";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { locale, toggle: toggleLocale } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div>
      <PageHeader title="Settings" subtitle="Workspace, preferences and security" icon={SettingsIcon} />

      <Tabs defaultValue="workspace" className="w-full">
        <TabsList className="mb-6 flex flex-wrap h-auto">
          <TabsTrigger value="workspace"><Users className="h-3.5 w-3.5 me-1.5" />Workspace</TabsTrigger>
          <TabsTrigger value="preferences"><Palette className="h-3.5 w-3.5 me-1.5" />Preferences</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-3.5 w-3.5 me-1.5" />Notifications</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-3.5 w-3.5 me-1.5" />Security</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="h-3.5 w-3.5 me-1.5" />Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display font-bold mb-4">Company profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Company name</Label><Input defaultValue="Nile Exports Co." className="mt-1.5" /></div>
              <div><Label>Country</Label><Input defaultValue="Egypt" className="mt-1.5" /></div>
              <div><Label>Trade license</Label><Input defaultValue="EG-2011-4820" className="mt-1.5" /></div>
              <div><Label>Tax ID</Label><Input defaultValue="100-482-018" className="mt-1.5" /></div>
              <div className="md:col-span-2"><Label>Address</Label><Input defaultValue="24 Corniche El Nile, Cairo, Egypt" className="mt-1.5" /></div>
            </div>
            <div className="mt-5 flex justify-end"><Button onClick={() => toast.success("Company profile saved")}>Save changes</Button></div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold">Role & permissions</h3>
                <p className="text-sm text-muted-foreground">Demo: switch active role to preview scoped experience</p>
              </div>
              <RoleSwitcher />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h3 className="font-display font-bold">Appearance & language</h3>
            <SettingRow icon={<Palette className="h-4 w-4" />} label="Dark mode" desc="Reduce eye strain in low-light">
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </SettingRow>
            <Separator />
            <SettingRow icon={<Globe2 className="h-4 w-4" />} label="Language" desc="Interface language & direction">
              <Button variant="outline" size="sm" onClick={toggleLocale}>{locale === "en" ? "English" : "العربية"}</Button>
            </SettingRow>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationPreferencesPanel />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h3 className="font-display font-bold">Security</h3>
            <SettingRow icon={<Shield className="h-4 w-4" />} label="Two-factor authentication" desc="Extra verification on sign-in"><Switch defaultChecked /></SettingRow>
            <Separator />
            <SettingRow label="Login alerts" desc="Notify on new device sign-in"><Switch defaultChecked /></SettingRow>
            <Separator />
            <div>
              <Label>Change password</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1.5">
                <Input type="password" placeholder="Current" />
                <Input type="password" placeholder="New" />
                <Input type="password" placeholder="Confirm" />
              </div>
              <div className="mt-4 flex justify-end"><Button onClick={() => toast.success("Password updated")}>Update password</Button></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <div className="rounded-2xl border border-border bg-gradient-primary text-primary-foreground p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider opacity-80">Current plan</div>
                <div className="mt-1 text-2xl font-display font-bold">Enterprise</div>
                <p className="mt-1 text-sm opacity-90">Unlimited shipments · Nova AI Pro · Priority support</p>
              </div>
              <div className="text-end">
                <div className="text-3xl font-display font-bold">$2,400</div>
                <div className="text-xs opacity-80">per month</div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => toast.message("Plan management", { description: "Opening billing portal…" })}>Manage plan</Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10" onClick={() => toast.message("Invoices", { description: "3 invoices available in Profile → Billing." })}>View invoices</Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display font-bold mb-4">Payment methods</h3>
            <div className="flex items-center justify-between p-3 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="h-9 w-14 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 grid place-items-center text-white text-xs font-bold">VISA</div>
                <div>
                  <div className="font-semibold text-sm">•••• 4820</div>
                  <div className="text-xs text-muted-foreground">Expires 09/28</div>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => toast.message("Update card", { description: "Card update flow will open here." })}>Update</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingRow({ label, desc, icon, children }: { label: string; desc: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        {icon && <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center text-muted-foreground shrink-0">{icon}</div>}
        <div className="min-w-0">
          <div className="font-semibold text-sm">{label}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
