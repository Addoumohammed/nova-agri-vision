import type { Database } from "@/integrations/supabase/types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export interface FullProfile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  avatarSignedUrl: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  website: string | null;
  taxId: string | null;
  locale: string;
  timezone: string | null;
  dateFormat: string | null;
  roles: AppRole[];
  createdAt: string;
  emailConfirmed: boolean;
}

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  notAfter: string | null;
  current: boolean;
}

export interface PrivacyPreferences {
  profileVisibility: "public" | "workspace" | "private";
  showEmail: boolean;
  analyticsOptIn: boolean;
  marketingEmails: boolean;
}

export const DEFAULT_PRIVACY: PrivacyPreferences = {
  profileVisibility: "workspace",
  showEmail: false,
  analyticsOptIn: true,
  marketingEmails: false,
};
