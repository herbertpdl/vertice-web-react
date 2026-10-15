import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLegalVersions } from "@/lib/api/legal";
import { legalVersionsDrift } from "./versions";

/**
 * Fetches the BFF's legal versions once per session and warns in the console when they differ
 * from the ones this build embeds (`LEGAL_VERSIONS`). A detector only: a failure is ignored and
 * nothing else depends on the answer. Used inside `(app)`, where the `/api/bff` proxy has a session.
 */
export function useLegalVersionsDriftWarning() {
  const { data } = useQuery({
    queryKey: ["legalVersions"],
    queryFn: fetchLegalVersions,
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    if (!data) return;
    const drift = legalVersionsDrift(data);
    if (drift.length > 0) {
      console.warn(
        `[vertice] Legal text versions differ from vertice-bff's GET /legal/versions (${drift.join("; ")}). ` +
          "Bump LEGAL_VERSIONS (src/lib/legal/versions.ts) and the BFF env together.",
      );
    }
  }, [data]);
}
