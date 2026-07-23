import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, Crown, Building2, Shield, Bell, Globe, Key, Users, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/profile/schemas";
import { AvatarEditor } from "@/components/profile/avatar-editor";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { SessionsList } from "@/components/profile/sessions-list";
import { PrivacyPanel } from "@/components/profile/privacy-panel";
import { DeleteAccountDialog } from "@/components/profile/delete-account-dialog";
import { RoleManagementPanel } from "@/components/profile/role-management-panel";
import { NotificationPreferencesPanel } from "@/components/notifications/notification-preferences-panel";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Profile & account · Nova Pro" },
      { name: "description", content: "Manage your Nova Pro identity, security, sessions and privacy." },
    ],
  }),
});

type Tab = "identity" | "security" | "privacy" | "notifications" | "roles";

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "identity", label: "Identity", icon: Building2 },
  { id: "security", label: "Security", icon: Shield },
  { id: "privacy", label: "Privacy", icon: Key },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "roles", label: "Roles", icon: Users },
];

function ProfilePage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("identity");
  const { data: profile, isLoading } = useProfile();

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">{t("profile.title") || "Profile"}</h1>
        <p className="text-muted-foreground text-sm">Manage your identity, security and preferences.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
        {isLoading || !profile ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-2xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <AvatarEditor
              userId={profile.id}
              signedUrl={profile.avatarSignedUrl}
              fullName={profile.fullName}
              size={80}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="truncate text-xl sm:text-2xl font-display font-bold">
                  {profile.fullName || "Unnamed user"}
                </h2>
                {profile.emailConfirmed && <BadgeCheck className="h-5 w-5 text-primary shrink-0" />}
              </div>
              <div className="text-muted-foreground text-sm truncate">
                {profile.company ? `${profile.company} · ` : ""}
                {profile.email}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.roles.length === 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    Member
                  </span>
                )}
                {profile.roles.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-primary text-primary-foreground capitalize"
                  >
                    <Crown className="h-3 w-3" /> {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((tb) => (
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

      {tab === "identity" && <IdentityTab />}

      {tab === "security" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant space-y-4">
            <h3 className="font-display font-semibold text-lg inline-flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" /> Change password
            </h3>
            {profile?.email ? (
              <ChangePasswordForm email={profile.email} />
            ) : (
              <Skeleton className="h-32 w-full" />
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant space-y-4">
            <h3 className="font-display font-semibold text-lg inline-flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Active sessions
            </h3>
            <SessionsList />
          </div>

          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
            <h3 className="font-display font-semibold text-lg text-destructive">Danger zone</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Permanently delete your account. This action cannot be undone.
            </p>
            {profile?.email && <DeleteAccountDialog email={profile.email} />}
          </div>
        </div>
      )}

      {tab === "privacy" && <PrivacyPanel />}

      {tab === "notifications" && <NotificationPreferencesPanel />}

      {tab === "roles" && <RoleManagementPanel />}
    </div>
  );
}

function IdentityTab() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const { locale, setLocale } = useI18n();

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: {
      fullName: profile?.fullName ?? "",
      phone: profile?.phone ?? "",
      company: profile?.company ?? "",
      country: profile?.country ?? "",
      website: profile?.website ?? "",
      taxId: profile?.taxId ?? "",
      locale: (profile?.locale as "en" | "ar") ?? locale,
      timezone: profile?.timezone ?? "",
      dateFormat: profile?.dateFormat ?? "",
    },
  });

  useEffect(() => {
    const l = form.watch("locale");
    if (l && l !== locale) setLocale(l);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch("locale")]);

  if (!profile) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit((v) => update.mutate(v))}
    >
      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant space-y-4">
        <h3 className="font-display font-semibold text-lg inline-flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" /> Personal & company
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={form.formState.errors.fullName?.message}>
            <Input {...form.register("fullName")} />
          </Field>
          <Field label="Email">
            <Input value={profile.email} disabled />
          </Field>
          <Field label="Phone" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} placeholder="+20 100 000 0000" />
          </Field>
          <Field label="Company" error={form.formState.errors.company?.message}>
            <Input {...form.register("company")} />
          </Field>
          <Field label="Country" error={form.formState.errors.country?.message}>
            <Input {...form.register("country")} />
          </Field>
          <Field label="Website" error={form.formState.errors.website?.message}>
            <Input {...form.register("website")} placeholder="https://…" />
          </Field>
          <Field label="Tax / VAT ID" error={form.formState.errors.taxId?.message}>
            <Input {...form.register("taxId")} />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant space-y-4">
        <h3 className="font-display font-semibold text-lg inline-flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" /> Localization
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Language">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...form.register("locale")}
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </Field>
          <Field label="Timezone">
            <Input {...form.register("timezone")} placeholder="e.g. Africa/Cairo" />
          </Field>
          <Field label="Date format">
            <Input {...form.register("dateFormat")} placeholder="e.g. DD/MM/YYYY" />
          </Field>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          className="gap-2 bg-gradient-primary shadow-glow"
          disabled={update.isPending || !form.formState.isDirty}
        >
          <Save className="h-4 w-4" /> Save changes
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
