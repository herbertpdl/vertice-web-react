import { apiClient } from "./client";
import type { MuscleGroup } from "./types";

/**
 * Reference data that admins add to and rename from the admin panel (PRD admin-panel R61, R62), so
 * it is cached for a while rather than forever: a trainer's open tab picks up a renamed group
 * within `MUSCLE_GROUPS_STALE_TIME` (admin-panel spec W17), on its next mount or focus.
 */
export const muscleGroupsQueryKey = ["muscleGroups"] as const;

/** 5 minutes: how long a muscle-group list is fresh, on both workspaces (spec W17, §9). */
export const MUSCLE_GROUPS_STALE_TIME = 5 * 60_000;

export function fetchMuscleGroups() {
  return apiClient.get<MuscleGroup[]>("/muscle-groups");
}
