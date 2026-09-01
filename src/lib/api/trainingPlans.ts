import { apiClient } from "./client";
import type { TrainingPlan, Workout, PlanLevel } from "./types";

export function fetchTrainingPlans(clientId?: number) {
  return apiClient.get<TrainingPlan[]>("/training-plans", { clientId });
}

export function fetchTrainingPlan(id: number) {
  return apiClient.get<TrainingPlan & { workouts: Workout[] }>(`/training-plans/${id}`);
}

export interface TrainingPlanInput {
  name: string;
  description?: string;
  clientId: number;
  startDate: string;
  endDate: string;
  level: PlanLevel;
}

export function createTrainingPlan(input: TrainingPlanInput) {
  return apiClient.post<TrainingPlan>("/training-plans", input);
}

export type TrainingPlanUpdateInput = Omit<TrainingPlanInput, "clientId">;

export function updateTrainingPlan(id: number, input: TrainingPlanUpdateInput) {
  return apiClient.patch<TrainingPlan>(`/training-plans/${id}`, input);
}

export function deleteTrainingPlan(id: number) {
  return apiClient.delete<void>(`/training-plans/${id}`);
}
