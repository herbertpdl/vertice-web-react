import { apiClient } from "./client";
import type {
  Workout,
  FullWorkout,
  RecentWorkoutSummary,
  DayOfWeek,
  WorkoutExerciseEntry,
} from "./types";

export function fetchRecentWorkouts() {
  return apiClient.get<RecentWorkoutSummary[]>("/workouts", { recent: "true" });
}

export function fetchWorkouts(planId: number) {
  return apiClient.get<Workout[]>(`/training-plans/${planId}/workouts`);
}

export interface WorkoutInput {
  name: string;
  dayOfWeek: DayOfWeek;
}

export interface WorkoutCreateInput extends WorkoutInput {
  /** Optional nested tree; omitted or `[]` creates an empty workout. Max 20. */
  exercises?: WorkoutExerciseEntry[];
}

/** Creates the workout and (optionally) its whole exercise/set tree in one call; returns the full tree with every new id. */
export function createWorkout(planId: number, input: WorkoutCreateInput) {
  return apiClient.post<FullWorkout>(`/training-plans/${planId}/workouts`, input);
}

export function fetchWorkout(id: number) {
  return apiClient.get<Workout>(`/workouts/${id}`);
}

export function fetchFullWorkout(id: number) {
  return apiClient.get<FullWorkout>(`/workouts/${id}/full`);
}

export function updateWorkout(id: number, input: WorkoutInput) {
  return apiClient.patch<Workout>(`/workouts/${id}`, input);
}

export function deleteWorkout(id: number) {
  return apiClient.delete<void>(`/workouts/${id}`);
}

/**
 * Replaces the workout's entire exercise/set tree (full replace, not merge).
 * Every WorkoutExercise/ExerciseSet id in the response is new. Refused with
 * 409 PRECONDITION_FAILED once any set under the workout has recorded data.
 */
export function replaceWorkoutExercises(workoutId: number, exercises: WorkoutExerciseEntry[]) {
  return apiClient.put<FullWorkout>(`/workouts/${workoutId}/exercises`, { exercises });
}
