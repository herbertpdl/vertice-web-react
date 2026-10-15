import { apiClient } from "./client";
import type { components } from "./schema";
import type { ExerciseSet } from "./types";

export function fetchExerciseSets(workoutExerciseId: number) {
  return apiClient.get<ExerciseSet[]>(`/workout-exercises/${workoutExerciseId}/sets`);
}

export type ExerciseSetInput = components["schemas"]["ExerciseSetRequest"];

export function createExerciseSet(workoutExerciseId: number, input: ExerciseSetInput) {
  return apiClient.post<ExerciseSet>(`/workout-exercises/${workoutExerciseId}/sets`, input);
}

// The BFF validates PATCH against the same schema as POST (setNumber/strategy
// required) - always send the full set, not a partial patch.
export function updateExerciseSet(id: number, input: ExerciseSetInput) {
  return apiClient.patch<ExerciseSet>(`/exercise-sets/${id}`, input);
}

export function deleteExerciseSet(id: number) {
  return apiClient.delete<void>(`/exercise-sets/${id}`);
}
