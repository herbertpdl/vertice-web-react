import { apiClient } from "./client";
import type { WorkoutExercise } from "./types";

export function fetchWorkoutExercises(workoutId: number) {
  return apiClient.get<WorkoutExercise[]>(`/workouts/${workoutId}/exercises`);
}

export interface WorkoutExerciseCreateInput {
  exerciseId: number;
  order: number;
  restSecondsBetweenSets: number;
  notes?: string;
}

export function addWorkoutExercise(workoutId: number, input: WorkoutExerciseCreateInput) {
  return apiClient.post<WorkoutExercise>(`/workouts/${workoutId}/exercises`, input);
}

export interface WorkoutExerciseUpdateInput {
  order: number;
  restSecondsBetweenSets: number;
  notes?: string;
}

export function updateWorkoutExercise(id: number, input: WorkoutExerciseUpdateInput) {
  return apiClient.patch<WorkoutExercise>(`/workout-exercises/${id}`, input);
}

export function deleteWorkoutExercise(id: number) {
  return apiClient.delete<void>(`/workout-exercises/${id}`);
}
