import { apiClient } from "./client";
import type { EnrichedFeedback } from "./types";

export function fetchFeedback() {
  return apiClient.get<EnrichedFeedback[]>("/feedback");
}
