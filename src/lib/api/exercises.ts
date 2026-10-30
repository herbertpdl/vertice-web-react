import { apiClient } from "./client";
import type { components } from "./schema";
import type { Exercise, ExercisePage, ExerciseProgressPoint, ProgressExercise } from "./types";

export interface ExerciseListParams {
  muscleGroupId?: number | null;
  q?: string;
}

/** The search text that triggers a query; shorter is never sent (spec D5). */
export const EXERCISE_SEARCH_MIN_LENGTH = 3;

/**
 * What a picker or the catalog may ask for (spec: lazy-exercise-search). Nothing until the
 * search has 3 or more letters or a group is chosen; below 3 letters the text is dropped, even
 * with a group, so results don't jump on each keystroke.
 */
export function exerciseSearch(search: string, muscleGroupId: number | null) {
  const trimmed = search.trim();
  const q = trimmed.length >= EXERCISE_SEARCH_MIN_LENGTH ? trimmed : "";
  return { muscleGroupId, q, enabled: q !== "" || muscleGroupId !== null };
}

/**
 * Normalized key of a paged search, so every screen produces the same key for the same
 * filter and `invalidateQueries({ queryKey: ["exercises"] })` covers them all.
 */
export function exercisesQueryKey(params: ExerciseListParams = {}) {
  return [
    "exercises",
    { muscleGroupId: params.muscleGroupId ?? null, q: (params.q ?? "").trim() },
  ] as const;
}

/** One page; `cursor` is the previous page's `nextCursor`. */
export function fetchExercisesPage(params: ExerciseListParams & { cursor?: string | null; limit?: number } = {}) {
  const q = (params.q ?? "").trim();
  return apiClient.get<ExercisePage>("/exercises", {
    muscleGroupId: params.muscleGroupId ?? undefined,
    q: q || undefined,
    cursor: params.cursor ?? undefined,
    limit: params.limit,
  });
}

/**
 * The progress picker's options for a student (spec: progress-exercise-picker): only exercises
 * with recorded loads, most recently trained first. Under the `["exercises"]` prefix, so a
 * rename in the catalog refreshes it too.
 */
export function progressExercisesQueryKey(clientId: number) {
  return ["exercises", "with-progress", clientId] as const;
}

export function fetchProgressExercises(clientId: number) {
  return apiClient.get<ProgressExercise[]>("/exercises/with-progress", { clientId });
}

export function fetchExercise(id: number) {
  return apiClient.get<Exercise>(`/exercises/${id}`);
}

export function fetchExerciseProgress(id: number, clientId?: number) {
  return apiClient.get<ExerciseProgressPoint[]>(`/exercises/${id}/progress`, {
    clientId,
  });
}

export type ExerciseInput = components["schemas"]["ExerciseRequest"];

export function createExercise(input: ExerciseInput) {
  return apiClient.post<Exercise>("/exercises", input);
}

export function updateExercise(id: number, input: ExerciseInput) {
  return apiClient.patch<Exercise>(`/exercises/${id}`, input);
}

export function deleteExercise(id: number) {
  return apiClient.delete<void>(`/exercises/${id}`);
}
