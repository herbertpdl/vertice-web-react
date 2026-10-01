import { apiClient } from "./client";
import type { MuscleGroup } from "./types";

/** Reference data the platform team changes rarely: consumers query it with `staleTime: Infinity`. */
export const muscleGroupsQueryKey = ["muscleGroups"] as const;

export function fetchMuscleGroups() {
  return apiClient.get<MuscleGroup[]>("/muscle-groups");
}
