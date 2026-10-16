import { apiClient } from "./client";
import type { LegalVersions } from "./types";

/** `GET /legal/versions` (public at the BFF; through `/api/bff`, so only with a session here). */
export function fetchLegalVersions() {
  return apiClient.get<LegalVersions>("/legal/versions");
}
