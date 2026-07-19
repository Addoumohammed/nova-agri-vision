import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
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
} from "lucide-react";
import { useState } from "react";
import { BrandMark, LocaleToggle, ThemeToggle } from "@/components/brand";
import { RoleSwitcher } from "@/components/role-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

type NavItem = { to: string; icon: React.ComponentType<{ className?: string }>; label: string };

function AppLayout() {
  const { t } = useI18n();
  const { role } = useRole();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const overview: NavItem[] = [
    { to: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
    { to: "/nova-ai", icon: Bot, label: t("nav.aiCopilot") },
  ];
  const network: NavItem[] = [
    { to: "/market", icon: Store, label: t("nav.marketplace") },
    { to: "/suppliers", icon: Users, label: t("nav.suppliers") },
    { to: "/buyers", icon: Building2, label: t("nav.buyers") },
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
          <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          <Section title={t("nav.section.overview")} items={overview} />
          <Section title={t("nav.section.network")} items={network} />
          <Section title={t("nav.section.operations")} items={operations} />
          <Section title={t("nav.section.insights")} items={insights} />
          <Section title={t("nav.section.account")} items={account} />
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent p-3">
            <div className="h-9 w-9 rounded-full bg-gradient-gold grid place-items-center text-sm font-bold text-gold-foreground shrink-0">
              KH
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">Karim Hassan</div>
              <div className="text-xs text-muted-foreground truncate capitalize">{role} · Nile Exports Co.</div>
            </div>
            <Link to="/">
              <Button variant="ghost" size="icon" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 border-b border-border glass">
          <div className="h-full px-4 sm:px-6 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search markets, shipments, insights…" className="ps-9 bg-card/60" />
            </div>
            <div className="ms-auto flex items-center gap-1">
              <div className="hidden md:block"><RoleSwitcher /></div>
              <LocaleToggle />
              <ThemeToggle />
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
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
