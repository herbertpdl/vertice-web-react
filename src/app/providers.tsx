"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { z } from "zod";

// Zod 4 probes `new Function("")` to pick its faster parser; the page CSP has no 'unsafe-eval'
// (src/lib/csp.ts), so the probe would only log a violation. Use the eval-free parser outright.
z.config({ jitless: true });

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
