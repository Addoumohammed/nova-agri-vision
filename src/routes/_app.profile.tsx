import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BadgeCheck,
  Crown,
  Building2,
  CreditCard,
  Shield,
  Bell,
  Globe,
  Key,
  Smartphone,
  Download,
  Trash2,
  Upload,
  Moon,
  Sun,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

type Tab = "company" | "billing" | "security" | "settings";

const tabs: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "company", label: "Company", icon: Building2 },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
  { id: "settings", label: "Settings", icon: Bell },
];

function ProfilePage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<Tab>("company");

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">{t("profile.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("profile.sub")}</p>
      </div>

      {/* Identity card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] sm:flex sm:flex-wrap items-center gap-4 sm:gap-6">
          <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl bg-gradient-gold grid place-items-center text-xl sm:text-2xl font-bold text-gold-foreground shadow-glow">
            KH
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="truncate text-xl sm:text-2xl font-display font-bold">Karim Hassan</h2>
              <BadgeCheck className="h-5 w-5 text-primary shrink-0" />
            </div>
            <div className="text-muted-foreground text-sm truncate">Founder · Nile Exports Co.</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-primary text-primary-foreground">
                <Crown className="h-3 w-3" /> {t("profile.plan")}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500">
                <BadgeCheck className="h-3 w-3" /> {t("profile.verified")}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="gap-2 shrink-0 col-span-2 sm:col-auto"
            onClick={() => toast.message("Upload photo", { description: "Choose a new profile picture (demo)." })}
          >
            <Upload className="h-4 w-4" /> Upload photo
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition",
              tab === tb.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <tb.icon className="h-4 w-4" /> {tb.label}
          </button>
        ))}
      </div>

      {tab === "company" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant space-y-4">
            <h3 className="font-display font-semibold text-lg">Company details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("auth.name")}</Label>
                <Input defaultValue="Karim Hassan" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("auth.email")}</Label>
                <Input defaultValue="karim@novapro.com" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("auth.company")}</Label>
                <Input defaultValue="Nile Exports Co." />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input defaultValue="Egypt" />
              </div>
              <div className="space-y-1.5">
                <Label>Tax / VAT ID</Label>
                <Input defaultValue="EG-4820-11934" />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input defaultValue="nileexports.com" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="bg-gradient-primary shadow-glow">{t("profile.save")}</Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { l: "Shipments", v: "284" },
              { l: "Countries reached", v: "24" },
              { l: "Lifetime value", v: "$12.4M" },
            ].map((k) => (
              <div key={k.l} className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
                <div className="text-sm text-muted-foreground">{k.l}</div>
                <div className="mt-2 text-2xl sm:text-3xl font-display font-bold text-gradient-primary">{k.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "billing" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-gradient-primary text-primary-foreground p-6 shadow-elegant relative overflow-hidden">
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs opacity-80">Current plan</div>
                <div className="mt-1 text-3xl font-display font-bold inline-flex items-center gap-2">
                  <Crown className="h-6 w-6" /> Nova Pro
                </div>
                <div className="text-sm opacity-80 mt-1">$499 / month · billed annually</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="gap-2">Manage</Button>
                <Button variant="outline" className="bg-white/10 border-white/20 text-primary-foreground hover:bg-white/20">
                  Upgrade
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
              <h3 className="font-display font-semibold text-lg mb-4 inline-flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Payment method
              </h3>
              <div className="rounded-xl border border-border bg-background p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold">Visa •••• 4242</div>
                  <div className="text-xs text-muted-foreground">Expires 08/28</div>
                </div>
                <Button size="sm" variant="outline">Change</Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
              <h3 className="font-display font-semibold text-lg mb-4">Usage this month</h3>
              {[
                { l: "AI queries", u: 1240, m: 2000 },
                { l: "Shipments tracked", u: 84, m: 200 },
                { l: "Market alerts", u: 46, m: 100 },
              ].map((u) => (
                <div key={u.l} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{u.l}</span>
                    <span className="font-mono">{u.u} / {u.m}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: `${(u.u / u.m) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-elegant overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="font-display font-semibold text-lg">Invoices</h3>
            </div>
            <div className="divide-y divide-border">
              {[
                { d: "Nov 01, 2025", n: "INV-2025-11", a: "$499.00", s: "Paid" },
                { d: "Oct 01, 2025", n: "INV-2025-10", a: "$499.00", s: "Paid" },
                { d: "Sep 01, 2025", n: "INV-2025-09", a: "$499.00", s: "Paid" },
              ].map((inv) => (
                <div key={inv.n} className="flex items-center justify-between px-6 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{inv.n}</div>
                    <div className="text-xs text-muted-foreground">{inv.d}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-semibold">{inv.s}</span>
                    <span className="font-mono">{inv.a}</span>
                    <Button size="icon" variant="ghost"><Download className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "security" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant space-y-4">
            <h3 className="font-display font-semibold text-lg inline-flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" /> Password
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Current password</Label>
                <Input type="password" defaultValue="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label>New password</Label>
                <Input type="password" placeholder="Enter new password" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="bg-gradient-primary shadow-glow">Update password</Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-semibold text-lg inline-flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" /> Two-factor authentication
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Protect your account with an extra layer of security.</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 bg-emerald-500/15 px-2.5 py-1 rounded-full">
                <Check className="h-3 w-3" /> Enabled
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
            <h3 className="font-display font-semibold text-lg mb-4">Active sessions</h3>
            <ul className="space-y-3">
              {[
                { d: "MacBook Pro · Cairo, EG", t: "Chrome · Active now", cur: true },
                { d: "iPhone 15 · Alexandria, EG", t: "Safari · 2h ago", cur: false },
                { d: "Windows PC · Rotterdam, NL", t: "Edge · 3d ago", cur: false },
              ].map((s) => (
                <li key={s.d} className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                  <div>
                    <div className="text-sm font-medium">{s.d}</div>
                    <div className="text-xs text-muted-foreground">{s.t}</div>
                  </div>
                  {s.cur ? (
                    <span className="text-xs font-semibold text-emerald-500">Current</span>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-red-500 gap-1">
                      <Trash2 className="h-3 w-3" /> Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
            <h3 className="font-display font-semibold text-lg mb-4 inline-flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Language
            </h3>
            <div className="flex gap-2">
              {(["en", "ar"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={cn(
                    "px-4 py-2 rounded-xl border text-sm font-medium transition",
                    locale === l ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent",
                  )}
                >
                  {l === "en" ? "English" : "العربية"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
            <h3 className="font-display font-semibold text-lg mb-4">Appearance</h3>
            <div className="flex gap-2">
              {(["light", "dark"] as const).map((th) => (
                <button
                  key={th}
                  onClick={() => setTheme(th)}
                  className={cn(
                    "px-4 py-2 rounded-xl border text-sm font-medium inline-flex items-center gap-2 transition",
                    theme === th ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent",
                  )}
                >
                  {th === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {th === "light" ? "Light" : "Dark"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
            <h3 className="font-display font-semibold text-lg mb-4 inline-flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Notifications
            </h3>
            <ul className="space-y-3">
              {[
                { l: "Market price alerts", on: true },
                { l: "Shipment status updates", on: true },
                { l: "Weather warnings", on: true },
                { l: "Weekly Nova AI digest", on: false },
                { l: "Product news & offers", on: false },
              ].map((n) => (
                <li key={n.l} className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                  <span className="text-sm font-medium">{n.l}</span>
                  <span
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition",
                      n.on ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 rounded-full bg-white transition",
                        n.on ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
            <h3 className="font-display font-semibold text-lg text-red-500">Danger zone</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500/10 gap-2">
              <Trash2 className="h-4 w-4" /> Delete account
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
