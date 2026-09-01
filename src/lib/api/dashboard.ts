import { apiClient } from "./client";
import type { DashboardData } from "./types";

export function fetchDashboard() {
  return apiClient.get<DashboardData>("/dashboard");
}
