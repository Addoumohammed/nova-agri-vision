import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Bot,
  Store,
  Users,
  Building2,
  ClipboardList,
  FileText,
  Ship,
  BarChart3,
  CloudSun,
  FileBarChart,
  Settings as SettingsIcon,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  FileQuestion,
  Handshake,
  Globe2,
  Plug,
  UserCircle2,
  Package,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BrandMark, LocaleToggle, ThemeToggle } from "@/components/brand";
import { RoleSwitcher } from "@/components/role-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

type NavItem = { to: string; icon: React.ComponentType<{ className?: string }>; label: string };

function AppLayout() {
  const { t } = useI18n();
  const { role } = useRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<{ email: string; name: string; company: string } | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const meta = (u.user_metadata ?? {}) as { full_name?: string; company?: string };
      setUser({
        email: u.email ?? "",
        name: meta.full_name || (u.email ?? "").split("@")[0] || "Account",
        company: meta.company || "Nova Pro",
      });
    });
  }, []);

  async function handleSignOut() {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    toast.success("Signed out");
    navigate({ to: "/login", replace: true });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim().toLowerCase();
    if (!q) return;
    const map: Record<string, string> = {
      dashboard: "/dashboard", ai: "/nova-ai", copilot: "/nova-ai", nova: "/nova-ai",
      market: "/market", marketplace: "/market",
      supplier: "/suppliers", suppliers: "/suppliers",
      buyer: "/buyers", buyers: "/buyers",
      rfq: "/rfq", quote: "/quotations", quotations: "/quotations",
      trade: "/trade-tools", order: "/orders", orders: "/orders",
      invoice: "/invoices", invoices: "/invoices",
      shipment: "/export", shipments: "/export", export: "/export",
      analytics: "/analytics", weather: "/weather",
      report: "/reports", reports: "/reports",
      integration: "/integrations", integrations: "/integrations",
      setting: "/settings", settings: "/settings",
      profile: "/profile", account: "/profile",
    };
    const match = Object.entries(map).find(([k]) => q.includes(k));
    if (match) {
      navigate({ to: match[1] });
      setSearch("");
    } else {
      toast.message(`No results for "${search}"`);
    }
  }


  const overview: NavItem[] = [
    { to: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
    { to: "/nova-ai", icon: Bot, label: t("nav.aiCopilot") },
  ];
  const network: NavItem[] = [
    { to: "/market", icon: Store, label: t("nav.marketplace") },
    { to: "/products", icon: Package, label: t("nav.products") },
    { to: "/suppliers", icon: Users, label: t("nav.suppliers") },
    { to: "/buyers", icon: Building2, label: t("nav.buyers") },
  ];
  const trade: NavItem[] = [
    { to: "/rfq", icon: FileQuestion, label: "RFQ" },
    { to: "/quotations", icon: Handshake, label: "Quotations" },
    { to: "/trade-tools", icon: Globe2, label: "Trade Tools" },
  ];
  const operations: NavItem[] = [
    { to: "/orders", icon: ClipboardList, label: t("nav.orders") },
    { to: "/invoices", icon: FileText, label: t("nav.invoices") },
    { to: "/export", icon: Ship, label: t("nav.shipments") },
  ];
  const insights: NavItem[] = [
    { to: "/analytics", icon: BarChart3, label: t("nav.analytics") },
    { to: "/weather", icon: CloudSun, label: t("nav.weatherIntel") },
    { to: "/reports", icon: FileBarChart, label: t("nav.reports") },
  ];
  const account: NavItem[] = [
    { to: "/profile", icon: UserCircle2, label: t("nav.profile") },
    { to: "/integrations", icon: Plug, label: "Integrations" },
    { to: "/settings", icon: SettingsIcon, label: t("nav.settings") },
  ];

  const renderItem = (it: NavItem) => {
    const active = pathname === it.to || pathname.startsWith(it.to + "/");
    return (
      <Link
        key={it.to}
        to={it.to}
        onClick={() => setOpen(false)}
        className={cn(
          "group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition",
          active
            ? "bg-gradient-primary text-primary-foreground shadow-glow"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <it.icon className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-80")} />
        <span className="truncate">{it.label}</span>
      </Link>
    );
  };

  const Section = ({ title, items }: { title: string; items: NavItem[] }) => (
    <div className="space-y-0.5">
      <div className="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {items.map(renderItem)}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={cn(
          "fixed lg:sticky top-0 z-40 h-screen w-72 shrink-0 border-e border-sidebar-border bg-sidebar text-sidebar-foreground",
          "flex flex-col transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full lg:translate-x-0",
        )}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-sidebar-border">
          <BrandMark />
          <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          <Section title={t("nav.section.overview")} items={overview} />
          <Section title={t("nav.section.network")} items={network} />
          <Section title="Trade" items={trade} />
          <Section title={t("nav.section.operations")} items={operations} />
          <Section title={t("nav.section.insights")} items={insights} />
          <Section title={t("nav.section.account")} items={account} />
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent p-3">
            <div className="h-9 w-9 rounded-full bg-gradient-gold grid place-items-center text-sm font-bold text-gold-foreground shrink-0">
              {(user?.name || "?").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user?.name ?? "…"}</div>
              <div className="text-xs text-muted-foreground truncate capitalize">{role} · {user?.company ?? ""}</div>
            </div>
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 border-b border-border glass">
          <div className="h-full px-4 sm:px-6 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md" role="search">
              <label htmlFor="global-search" className="sr-only">Search Nova Pro</label>
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="global-search"
                placeholder="Search markets, shipments, insights…"
                className="ps-9 bg-card/60"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
            </form>
            <div className="ms-auto flex items-center gap-1">
              <div className="hidden md:block"><RoleSwitcher /></div>
              <LocaleToggle />
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="relative"
                onClick={() => toast.message("No new notifications", { description: "You're all caught up." })}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
