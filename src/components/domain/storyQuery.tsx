import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Decorator } from "@storybook/nextjs-vite";

/** A QueryClientProvider decorator with pre-seeded, never-stale cache entries (no BFF in Storybook). */
export function withSeededQueries(seed: Record<string, unknown>): Decorator {
  return function SeededQueries(Story) {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    for (const [key, value] of Object.entries(seed)) {
      client.setQueryData(JSON.parse(key), value);
    }
    return (
      <QueryClientProvider client={client}>
        <Story />
      </QueryClientProvider>
    );
  };
}
