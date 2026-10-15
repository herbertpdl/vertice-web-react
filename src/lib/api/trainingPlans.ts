import { apiClient } from "./client";
import type { components } from "./schema";
import type { TrainingPlan, TrainingPlanDetail } from "./types";

export function fetchTrainingPlans(clientId?: number) {
  return apiClient.get<TrainingPlan[]>("/training-plans", { clientId });
}

export function fetchTrainingPlan(id: number) {
  return apiClient.get<TrainingPlanDetail>(`/training-plans/${id}`);
}

export type TrainingPlanInput = components["schemas"]["TrainingPlanRequest"];

export function createTrainingPlan(input: TrainingPlanInput) {
  return apiClient.post<TrainingPlan>("/training-plans", input);
}

/** `PATCH /training-plans/:id` takes the same body minus `clientId`: a plan never changes client. */
export type TrainingPlanUpdateInput = components["schemas"]["UpdateTrainingPlanRequest"];

export function updateTrainingPlan(id: number, input: TrainingPlanUpdateInput) {
  return apiClient.patch<TrainingPlan>(`/training-plans/${id}`, input);
}

export function deleteTrainingPlan(id: number) {
  return apiClient.delete<void>(`/training-plans/${id}`);
}
