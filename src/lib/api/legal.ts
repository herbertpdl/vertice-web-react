import { apiClient } from "./client";

/** `GET /legal/versions` (public at the BFF; through `/api/bff`, so only with a session here). */
export interface LegalVersions {
  terms: string;
  healthData: string;
}

export function fetchLegalVersions() {
  return apiClient.get<LegalVersions>("/legal/versions");
}
