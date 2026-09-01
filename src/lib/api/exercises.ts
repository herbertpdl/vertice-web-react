import { apiClient } from "./client";
import type { Exercise, ExerciseProgressPoint, MuscleGroup } from "./types";

export function fetchExercises() {
  return apiClient.get<Exercise[]>("/exercises");
}

export function fetchExercise(id: number) {
  return apiClient.get<Exercise>(`/exercises/${id}`);
}

export function fetchExerciseProgress(id: number, clientId?: number) {
  return apiClient.get<ExerciseProgressPoint[]>(`/exercises/${id}/progress`, {
    clientId,
  });
}

export interface ExerciseInput {
  name: string;
  description: string;
  videoUrl?: string;
  muscleGroup: MuscleGroup;
}

export function createExercise(input: ExerciseInput) {
  return apiClient.post<Exercise>("/exercises", input);
}

export function updateExercise(id: number, input: ExerciseInput) {
  return apiClient.patch<Exercise>(`/exercises/${id}`, input);
}

export function deleteExercise(id: number) {
  return apiClient.delete<void>(`/exercises/${id}`);
}
