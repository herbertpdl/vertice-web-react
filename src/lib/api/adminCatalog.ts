import { apiClient } from "./client";
import type { PageRequest } from "./admin";
import type {
  AdminCatalogExercise,
  AdminCatalogPage,
  AdminCatalogScope,
  AdminExerciseRequest,
  AdminMostUsedPage,
  MuscleGroup,
} from "./types";

/**
 * The admin catalog (admin-panel spec W15, §9; BFF VRT-31): the starter set and trainers' private
 * exercises, the most-used list, and the muscle groups. Every write records a history entry, and
 * the caller invalidates per §9 (`invalidateAfterExerciseWrite`, `invalidateAfterMuscleGroupWrite`
 * in `src/lib/admin/catalog.ts`).
 */

/** `GET /admin/exercises` filters. Absent means "any"; `q` is trimmed by the caller (≤ 100). */
export interface AdminCatalogFilters {
  scope: AdminCatalogScope;
  muscleGroupId?: number;
  q?: string;
}

/** `GET /admin/exercises/most-used` filters. */
export interface AdminMostUsedFilters {
  muscleGroupId?: number;
}

export function fetchAdminCatalog(filters: AdminCatalogFilters, page: PageRequest) {
  return apiClient.get<AdminCatalogPage>("/admin/exercises", {
    scope: filters.scope,
    muscleGroupId: filters.muscleGroupId,
    q: filters.q || undefined,
    limit: page.limit,
    cursor: page.cursor ?? undefined,
  });
}

export function fetchAdminMostUsed(filters: AdminMostUsedFilters, page: PageRequest) {
  return apiClient.get<AdminMostUsedPage>("/admin/exercises/most-used", {
    muscleGroupId: filters.muscleGroupId,
    limit: page.limit,
    cursor: page.cursor ?? undefined,
  });
}

/** `POST /admin/exercises`. 409 `NAME_TAKEN`: a starter exercise already has that name. */
export function createAdminStarterExercise(input: AdminExerciseRequest) {
  return apiClient.post<AdminCatalogExercise>("/admin/exercises", input);
}

/** `PUT /admin/exercises/:id`, a full replace (every field). 403: a private exercise. */
export function updateAdminStarterExercise(id: number, input: AdminExerciseRequest) {
  return apiClient.put<AdminCatalogExercise>(`/admin/exercises/${id}`, input);
}

/** `DELETE /admin/exercises/:id`. 409 `EXERCISE_IN_USE`: a workout contains it. 204. */
export function deleteAdminStarterExercise(id: number) {
  return apiClient.delete<void>(`/admin/exercises/${id}`);
}

/**
 * `POST /admin/exercises/:id/promote`: a new starter exercise from the edited copy; the trainer's
 * own exercise is left untouched. 409 `PRECONDITION_FAILED`: already a starter one.
 */
export function promoteAdminExercise(id: number, input: AdminExerciseRequest) {
  return apiClient.post<AdminCatalogExercise>(`/admin/exercises/${id}/promote`, input);
}

/** `POST /admin/muscle-groups`. 409 `NAME_TAKEN`. There is no delete (R63). */
export function createAdminMuscleGroup(name: string) {
  return apiClient.post<MuscleGroup>("/admin/muscle-groups", { name });
}

/** `PATCH /admin/muscle-groups/:id`. 409 `NAME_TAKEN`; 404 when missing. */
export function renameAdminMuscleGroup(id: number, name: string) {
  return apiClient.patch<MuscleGroup>(`/admin/muscle-groups/${id}`, { name });
}
