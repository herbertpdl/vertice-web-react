import { apiClient } from "./client";
import type { Workout, FullWorkout, RecentWorkoutSummary, DayOfWeek } from "./types";

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

export function createWorkout(planId: number, input: WorkoutInput) {
  return apiClient.post<Workout>(`/training-plans/${planId}/workouts`, input);
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

export interface CloneWorkoutInput {
  targetTrainingPlanId: number;
  name: string;
  dayOfWeek: DayOfWeek;
}

export function cloneWorkout(id: number, input: CloneWorkoutInput) {
  return apiClient.post<Workout>(`/workouts/${id}/clone`, input);
}
