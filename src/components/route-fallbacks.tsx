import { Link, useRouter } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

/**
 * Shared route fallbacks used by every route via router defaults.
 * Route files may override with their own errorComponent/notFoundComponent.
 */

export function RouteErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[route error]", error);
    reportLovableError(error, { boundary: "tanstack_route_default_error" });
  }, [error]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-[60vh] flex items-center justify-center p-6"
    >
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-elegant text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 text-destructive grid place-items-center">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-tight">
          This section couldn't load
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {error?.message || "An unexpected error occurred while loading this page."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 transition"
          >
            Try again
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RouteNotFoundFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-display font-bold text-gradient-primary">404</h1>
        <h2 className="mt-3 text-lg font-semibold">Section not found</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-5">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 transition"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RoutePendingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="min-h-[40vh] flex items-center justify-center"
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
