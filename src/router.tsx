import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Production-tuned defaults:
  // - staleTime 60s: reuse fetched data across navigations, cut duplicate network calls
  // - gcTime 5m: keep unused queries around for quick back/forward
  // - retry once, exponential backoff (max 3s)
  // - no refetch on window focus / reconnect (chatty on mobile / flaky networks)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 3000),
      },
      mutations: {
        retry: 0,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Prefetch route chunks on hover/focus for instant navigation.
    defaultPreload: "intent",
    // Query owns cache freshness; router just delivers chunks.
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 300,
    defaultPendingMinMs: 150,
  });

  return router;
};
