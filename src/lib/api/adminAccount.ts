import { apiClient } from "./client";
import type { AdminUserResult } from "./types";

/**
 * The admin panel's account writes (admin-panel spec W15, §9; BFF VRT-28). Every one writes a
 * history entry. The caller trims the reason (`adminReasonSchema`) and invalidates per §9.
 */

/** `POST /admin/users/:id/suspend`. 409 `PRECONDITION_FAILED`: already suspended. */
export function suspendAdminUser(id: number, reason: string) {
  return apiClient.post<AdminUserResult>(`/admin/users/${id}/suspend`, { reason });
}

/** `POST /admin/users/:id/reactivate`. 409 `PRECONDITION_FAILED`: not suspended. */
export function reactivateAdminUser(id: number, reason: string) {
  return apiClient.post<AdminUserResult>(`/admin/users/${id}/reactivate`, { reason });
}

/** `POST /admin/users/:id/first-access-email` (clients only; a trainer is a 404). 204. */
export function sendAdminFirstAccessEmail(id: number) {
  return apiClient.post<void>(`/admin/users/${id}/first-access-email`);
}

/** `POST /admin/users/:id/password-reset-email`. 204. */
export function sendAdminPasswordResetEmail(id: number) {
  return apiClient.post<void>(`/admin/users/${id}/password-reset-email`);
}

/** `DELETE /admin/relationships/:trainerId/:clientId` (BFF B17). 404: not an active relationship. */
export function endAdminRelationship(trainerId: number, clientId: number) {
  return apiClient.delete<void>(`/admin/relationships/${trainerId}/${clientId}`);
}
