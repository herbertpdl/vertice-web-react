import { apiClient } from "./client";
import type { components } from "./schema";
import type { Exercise, ExercisePage, ExerciseProgressPoint } from "./types";

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

/** Under the same prefix, so a catalog change invalidates it too. */
export const allExercisesQueryKey = ["exercises", "all"] as const;

/**
 * Every visible exercise, page by page. Only the student progress dropdown uses it until that
 * becomes a searchable picker (spec §6): never use it for a picker or the catalog.
 */
export async function fetchAllExercises(): Promise<Exercise[]> {
  const all: Exercise[] = [];
  let cursor: string | null = null;
  do {
    const page: ExercisePage = await fetchExercisesPage({ cursor, limit: 50 });
    all.push(...page.exercises);
    cursor = page.nextCursor;
  } while (cursor !== null);
  return all;
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
