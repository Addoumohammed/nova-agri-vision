
# Sprint 15 — Settings & User Profile

Both `/_app/profile` and `/_app/settings` are currently demo-only: hardcoded name/email, fake sessions, defaultValue inputs with no persistence, no password change, no avatar upload, no real role/session data. This sprint makes them fully functional against Supabase, following the same layered architecture used in prior sprints (functions → schemas → hooks → UI).

## Scope

**In:** Profile (identity, avatar, company), password change, sessions, roles, notification prefs (reuse), language/theme, privacy, account deletion, validation, i18n, RTL.
**Out:** New billing/invoicing logic (keep existing UI as read-only demo), 2FA enrollment beyond status (Supabase MFA API wired later), SAML/SSO admin.

## Architecture

```text
src/lib/profile/
  types.ts          Profile, UpdateProfileInput, ChangePasswordInput, PrivacyPrefs
  schemas.ts        Zod: profile update, password policy (reuse auth/service), privacy
src/lib/profile.functions.ts
  getMyProfile               requireSupabaseAuth → profiles row + auth email + role list
  updateMyProfile            validated update to profiles (full_name, company, country, phone, website, tax_id, avatar_url)
  changeMyPassword           reauth with current pw then supabase.auth.updateUser (server-side via user client)
  uploadAvatar               signed upload to storage bucket 'avatars' (path: {userId}/avatar.<ext>), returns public URL
  removeAvatar
  listMySessions             supabaseAdmin.auth.admin.listUserSessions(userId) — after admin check via has_role? No: users may list own via admin API scoped to userId (safe: only own userId)
  revokeSession(sessionId)   supabaseAdmin.auth.admin.signOut(sessionId, 'local')
  revokeAllOtherSessions
  getPrivacyPrefs / savePrivacyPrefs   user_settings.prefs.privacy
  requestAccountDeletion     inserts audit_log + calls admin.deleteUser after confirmation token match
src/hooks/
  use-profile.ts             useProfile, useUpdateProfile, useAvatarUpload
  use-password.ts            useChangePassword
  use-sessions.ts            useSessions, useRevokeSession, useRevokeAll
  use-privacy.ts
```

Reuse: `passwordPolicySchema`, `scorePassword` from `src/lib/auth/service.ts`; `usePreferences` from notifications hook for notification prefs tab.

## Storage

Create `avatars` bucket (public read, authenticated write to own folder). RLS on `storage.objects`:
- SELECT: public
- INSERT/UPDATE/DELETE: `auth.uid()::text = (storage.foldername(name))[1]`
Max 2MB, image/* only, client-side resize to 512px square before upload.

## Schema changes

`profiles` currently has `id, full_name, avatar_url` plus a few. Add via migration if missing:
- `company text, country text, phone text, website text, tax_id text, updated_at timestamptz`
- trigger `set_updated_at`

Add `privacy` shape into existing `user_settings.prefs` JSONB — no schema change.

## UI

### `/_app/profile` — personal identity only
- Header card: real avatar (from `profiles.avatar_url`), name, email (readonly, from auth), role badges (from `user_roles`), "Change photo" opens `AvatarUploadDialog`.
- **Personal info** section: full_name, phone, country (Zod validated, Save button disabled until dirty).
- **Company info** section: company, tax_id, website.
- **Stats strip**: keep, but derive real counts (orders, shipments) via lightweight aggregates — if too broad, leave demo but mark as computed.

Remove billing/security/settings tabs from Profile — those move to Settings.

### `/_app/settings` — workspace + account controls
Tabs (shadcn `Tabs`):
1. **General** — company profile (shared with profile? keep here for admin; profile page owns personal). Language, Theme, Timezone, Date format.
2. **Notifications** — existing `NotificationPreferencesPanel`.
3. **Security**
   - Change password form: current + new + confirm, strength meter, HIBP handled by Supabase policy.
   - Sessions list (real): device, browser (parse UA), IP, last seen, "current" badge, Revoke, "Sign out other sessions".
   - 2FA status card (show enabled/disabled from `supabase.auth.mfa.listFactors()`, link "Manage" that is a placeholder unless user asks to build enrollment now).
4. **Privacy** — profile visibility, analytics opt-in, marketing emails, data export request button (emails ZIP later — for now trigger `requestDataExport` server fn that inserts a row and toasts).
5. **Roles & access** — visible only to admins (via `has_role`): list workspace members from `organization_members`, change role dropdown, invite by email (creates pending row).
6. **Billing** — keep existing demo UI unchanged.
7. **Danger zone** — delete account with typed-confirmation ("delete my account"), calls `requestAccountDeletion`.

Remove the demo `RoleSwitcher` from settings (it's a dev tool) — move behind `import.meta.env.DEV`.

## Validation & security

- All mutations go through Zod on server (`inputValidator`) and client (react-hook-form + zodResolver).
- Password change: verify current password by re-signing in with `signInWithPassword` before `updateUser`; on success invalidate other sessions.
- Avatar upload: MIME sniff + size check server-side rejection if bucket policy insufficient.
- Session revoke: only allow revoking sessions owned by `context.userId`.
- Account deletion: require typed confirmation + password re-entry; server fn re-verifies password then `supabaseAdmin.auth.admin.deleteUser`.
- Admin-only tabs gated by `has_role('admin')` server check, not client-only.

## Performance

- TanStack Query with keyed caches per userId; `staleTime: 60s` for profile, `30s` for sessions.
- Avatar image: `loading="lazy"`, resized before upload → single ~50KB PNG.
- Split settings tabs with `React.lazy` per panel.

## i18n

Add `settings.*` and `profile.*` keys in both `en` and `ar`; verify RTL layout on session rows and toggles.

## Deliverables checklist

- [ ] Migration: extend `profiles`, create `avatars` bucket + policies
- [ ] `src/lib/profile/{types,schemas}.ts`, `src/lib/profile.functions.ts`
- [ ] Hooks: `use-profile`, `use-password`, `use-sessions`, `use-privacy`
- [ ] Components: `AvatarUploadDialog`, `ChangePasswordForm`, `SessionsList`, `PrivacyPanel`, `RoleManagementPanel`, `DeleteAccountDialog`
- [ ] Rewritten `src/routes/_app.profile.tsx` and `src/routes/_app.settings.tsx`
- [ ] i18n keys en/ar
- [ ] Typecheck + manual smoke: update name, upload avatar, change password, revoke session, toggle prefs, switch language/theme, delete-account confirmation gate
