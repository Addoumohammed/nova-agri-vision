import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getMyProfile, updateMyProfile, setAvatarPath, removeAvatar,
  listMySessions, revokeSession, revokeOtherSessions,
  getPrivacyPrefs, savePrivacyPrefs,
  requestDataExport, requestAccountDeletion,
  listWorkspaceMembers, setUserRole,
} from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import type { UpdateProfileInput } from "@/lib/profile/schemas";
import type { PrivacyPreferences, AppRole } from "@/lib/profile/types";

export function useProfile() {
  const fn = useServerFn(getMyProfile);
  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const fn = useServerFn(updateMyProfile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", "me"] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update profile"),
  });
}

export function useAvatarUpload() {
  const setPath = useServerFn(setAvatarPath);
  const remove = useServerFn(removeAvatar);
  const qc = useQueryClient();

  const upload = useMutation({
    mutationFn: async ({ file, userId }: { file: File; userId: string }) => {
      if (!file.type.startsWith("image/")) throw new Error("Please choose an image");
      if (file.size > 2 * 1024 * 1024) throw new Error("Image must be under 2MB");
      const resized = await resizeImage(file, 512);
      const ext = resized.type === "image/png" ? "png" : "jpg";
      const path = `${userId}/avatar.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, resized, { upsert: true, contentType: resized.type, cacheControl: "3600" });
      if (error) throw new Error(error.message);
      return setPath({ data: { path } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", "me"] });
      toast.success("Photo updated");
    },
    onError: (e: Error) => toast.error(e.message || "Upload failed"),
  });

  const del = useMutation({
    mutationFn: () => remove(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", "me"] });
      toast.success("Photo removed");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  return { upload, remove: del };
}

async function resizeImage(file: File, max: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode image"))),
      type,
      0.9,
    ),
  );
}

// ------------------------------------------------------------
export function useChangePassword() {
  return useMutation({
    mutationFn: async ({
      email,
      currentPassword,
      newPassword,
    }: { email: string; currentPassword: string; newPassword: string }) => {
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthErr) throw new Error("Current password is incorrect");
      const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updErr) throw new Error(updErr.message);
      return { ok: true };
    },
    onSuccess: () => toast.success("Password updated"),
    onError: (e: Error) => toast.error(e.message),
  });
}

// ------------------------------------------------------------
export function useSessions() {
  const fn = useServerFn(listMySessions);
  return useQuery({
    queryKey: ["profile", "sessions"],
    queryFn: () => fn(),
    staleTime: 30_000,
  });
}

export function useRevokeSession() {
  const fn = useServerFn(revokeSession);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => fn({ data: { sessionId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", "sessions"] });
      toast.success("Session revoked");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRevokeOtherSessions() {
  const fn = useServerFn(revokeOtherSessions);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fn(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["profile", "sessions"] });
      toast.success(`Signed out ${r.revoked} session(s)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ------------------------------------------------------------
export function usePrivacyPrefs() {
  const fn = useServerFn(getPrivacyPrefs);
  return useQuery({
    queryKey: ["profile", "privacy"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}

export function useSavePrivacy() {
  const fn = useServerFn(savePrivacyPrefs);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PrivacyPreferences) => fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", "privacy"] });
      toast.success("Privacy preferences saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ------------------------------------------------------------
export function useRequestDataExport() {
  const fn = useServerFn(requestDataExport);
  return useMutation({
    mutationFn: () => fn(),
    onSuccess: () => toast.success("Data export requested. We'll email you when ready."),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAccount() {
  const fn = useServerFn(requestAccountDeletion);
  return useMutation({
    mutationFn: async ({
      email,
      password,
      confirmation,
      reason,
    }: { email: string; password: string; confirmation: "delete my account"; reason?: string }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error("Password is incorrect");
      return fn({ data: { confirmation, reason } });
    },
    onSuccess: async () => {
      toast.success("Account deleted");
      await supabase.auth.signOut();
      window.location.href = "/";
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ------------------------------------------------------------
export function useWorkspaceMembers() {
  const fn = useServerFn(listWorkspaceMembers);
  return useQuery({
    queryKey: ["profile", "members"],
    queryFn: () => fn(),
    staleTime: 30_000,
    retry: false,
  });
}

export function useSetMemberRole() {
  const fn = useServerFn(setUserRole);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; role: AppRole; grant: boolean }) => fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", "members"] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
