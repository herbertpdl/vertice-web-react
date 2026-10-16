import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Decorator } from "@storybook/nextjs-vite";
import { ApiError } from "@/lib/api/client";

export interface SeedStates {
  /** JSON query keys whose fetch never settles (loading states). */
  pending?: string[];
  /** JSON query keys whose fetch has failed (error states). */
  failing?: string[];
  /** Called with the story's QueryClient once seeded, e.g. to spy on `invalidateQueries`. */
  onClient?: (client: QueryClient) => void;
}

/**
 * A QueryClientProvider decorator with pre-seeded, never-stale cache entries (no BFF in Storybook).
 * `pending`/`failing` keys start in flight forever or already failed; `retryOnMount: false`
 * keeps a failed query from refetching when the component mounts.
 */
export function withSeededQueries(
  seed: Record<string, unknown>,
  { pending = [], failing = [], onClient }: SeedStates = {},
): Decorator {
  return function SeededQueries(Story) {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, retryOnMount: false } },
    });
    for (const [key, value] of Object.entries(seed)) {
      client.setQueryData(JSON.parse(key), value);
    }
    for (const key of pending) {
      // An in-flight fetch: the component's own mount fetch dedupes onto it.
      void client.prefetchQuery({ queryKey: JSON.parse(key), queryFn: () => new Promise(() => {}) });
    }
    for (const key of failing) {
      const query = client.getQueryCache().build(client, { queryKey: JSON.parse(key) });
      query.setState({
        status: "error",
        fetchStatus: "idle",
        // The code the BFF actually sends with a 503 (`ApiErrorCode`), not a made-up one.
        error: new ApiError({ code: "UPSTREAM_UNAVAILABLE", message: "Service unavailable" }, 503),
        errorUpdatedAt: Date.now(),
        errorUpdateCount: 1,
      });
    }
    onClient?.(client);
    return (
      <QueryClientProvider client={client}>
        <Story />
      </QueryClientProvider>
    );
  };
}
