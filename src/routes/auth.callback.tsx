import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/brand";

type Search = { next?: string; code?: string; error_description?: string };

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({
    next: typeof s.next === "string" ? s.next : undefined,
    code: typeof s.code === "string" ? s.code : undefined,
    error_description: typeof s.error_description === "string" ? s.error_description : undefined,
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/callback" }) as Search;
  const [message, setMessage] = useState("Finalizing sign-in…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (search.error_description) {
        toast.error(search.error_description);
        navigate({ to: "/login", replace: true });
        return;
      }
      try {
        // PKCE code exchange (?code=...)
        if (search.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
        } else {
          // Wait for hash-based session (implicit / recovery)
          await new Promise((r) => setTimeout(r, 200));
        }
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        const dest = sanitizeNext(search.next) ?? (data.session ? "/dashboard" : "/login");
        navigate({ to: dest, replace: true });
      } catch (err) {
        toast.error((err as Error).message || "Sign-in failed");
        setMessage("Sign-in failed. Redirecting…");
        setTimeout(() => navigate({ to: "/login", replace: true }), 800);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, search]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <BrandMark size="lg" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function sanitizeNext(next?: string): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}
