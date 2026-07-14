import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-display font-bold">{t("profile.title")}</h1>
        <p className="text-muted-foreground">{t("profile.sub")}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant flex flex-wrap items-center gap-6">
        <div className="h-20 w-20 rounded-2xl bg-gradient-gold grid place-items-center text-2xl font-bold text-gold-foreground shadow-glow">
          KH
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-display font-bold">Karim Hassan</h2>
            <BadgeCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="text-muted-foreground">Founder · Nile Exports Co.</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-primary text-primary-foreground">
              <Crown className="h-3 w-3" /> {t("profile.plan")}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500">
              <BadgeCheck className="h-3 w-3" /> {t("profile.verified")}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant space-y-4">
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
            <div className="mt-2 text-3xl font-display font-bold text-gradient-primary">{k.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
