import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  listNotifications, countUnread, markRead, markUnread, markAllRead,
  deleteNotification, clearAll, createSelfNotification,
  getPreferences, savePreferences,
  type NotificationKind, type NotificationPreferences,
} from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";

export function useNotifications(filter: "all" | "unread" = "all", kind: NotificationKind | "all" = "all") {
  const list = useServerFn(listNotifications);
  return useQuery({
    queryKey: ["notifications", "list", filter, kind],
    queryFn: () => list({ data: { filter, kind } }),
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useUnreadCount() {
  const count = useServerFn(countUnread);
  return useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => count(),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Realtime subscription: invalidate on any change to the current user's notifications. */
export function useNotificationsRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      channel = supabase
        .channel(`notif:${data.user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${data.user.id}` },
          (payload) => {
            qc.invalidateQueries({ queryKey: ["notifications"] });
            if (payload.eventType === "INSERT") {
              const row = payload.new as { title?: string };
              if (row?.title) toast(row.title, { description: "New notification" });
            }
          },
        )
        .subscribe();
    });
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);
}

export function useNotificationMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications"] });

  const readFn = useServerFn(markRead);
  const unreadFn = useServerFn(markUnread);
  const allFn = useServerFn(markAllRead);
  const delFn = useServerFn(deleteNotification);
  const clearFn = useServerFn(clearAll);
  const createFn = useServerFn(createSelfNotification);

  const wrap = <T,>(fn: (v: T) => Promise<unknown>, okMsg?: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: () => { invalidate(); if (okMsg) toast.success(okMsg); },
      onError: (e: Error) => toast.error(e.message || "Something went wrong"),
    });

  return {
    markRead: wrap<{ id: string }>((v) => readFn({ data: v })),
    markUnread: wrap<{ id: string }>((v) => unreadFn({ data: v })),
    markAllRead: wrap<void>(() => allFn(), "All notifications marked read"),
    remove: wrap<{ id: string }>((v) => delFn({ data: v }), "Notification deleted"),
    clearAll: wrap<{ onlyRead?: boolean }>((v) => clearFn({ data: v }), "Notifications cleared"),
    createSelf: wrap<{ title: string; body?: string; kind?: NotificationKind; link?: string }>(
      (v) => createFn({ data: v }),
      "Notification sent",
    ),
  };
}

export function usePreferences() {
  const qc = useQueryClient();
  const getFn = useServerFn(getPreferences);
  const saveFn = useServerFn(savePreferences);
  const query = useQuery({
    queryKey: ["notifications", "prefs"],
    queryFn: () => getFn(),
    staleTime: 5 * 60_000,
  });
  const save = useMutation({
    mutationFn: (p: NotificationPreferences) => saveFn({ data: p }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "prefs"] });
      toast.success("Preferences saved");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save preferences"),
  });
  return { ...query, save };
}
