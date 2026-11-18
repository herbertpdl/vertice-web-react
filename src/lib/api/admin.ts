import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";
import type {
  AdminAction,
  AdminActionAdmins,
  AdminActionPage,
  AdminDashboard,
  AdminDirectoryPage,
  AdminDirectoryRole,
  AdminPageSize,
  AdminUserProfile,
} from "./types";

/**
 * The admin panel's reads (admin-panel spec W15, §9; BFF "Admin panel — /admin"). Every list pages
 * by `limit` (10, 25 or 50) and `cursor` (the previous page's `nextCursor`, sent back with the same
 * filters), with no page numbers or totals.
 */

/** `GET /admin/users` filters. Absent means "any"; `q` is trimmed by the caller (≤ 100). */
export interface AdminUserFilters {
  role?: AdminDirectoryRole;
  status?: "ACTIVE" | "SUSPENDED";
  q?: string;
}

/** `GET /admin/actions` filters. */
export interface AdminActionFilters {
  adminId?: number;
  action?: AdminAction;
  targetUserId?: number;
}

/** One page of a list: its size and the cursor that names it (`null` for the first page). */
export interface PageRequest {
  limit: AdminPageSize;
  cursor: string | null;
}

/**
 * The admin query keys (W16). Each starts with `"admin"`, but invalidation always names the
 * resource (`adminKeys.users()`, never the bare `["admin"]`): invalidating the whole prefix would
 * refetch an open profile, and every profile fetch writes a history entry.
 */
export const adminKeys = {
  dashboard: () => ["admin", "dashboard"] as const,
  users: () => ["admin", "users"] as const,
  usersPage: (filters: AdminUserFilters, page: PageRequest) =>
    ["admin", "users", { ...filters, ...page }] as const,
  profile: (id: number) => ["admin", "profile", id] as const,
  actions: () => ["admin", "actions"] as const,
  actionsPage: (filters: AdminActionFilters, page: PageRequest) =>
    ["admin", "actions", { ...filters, ...page }] as const,
  suspension: (id: number) => ["admin", "actions", "suspension", id] as const,
  actionAdmins: () => ["admin", "action-admins"] as const,
};

export function fetchAdminDashboard() {
  return apiClient.get<AdminDashboard>("/admin/dashboard");
}

export function fetchAdminUsers(filters: AdminUserFilters, page: PageRequest) {
  return apiClient.get<AdminDirectoryPage>("/admin/users", {
    role: filters.role,
    status: filters.status,
    q: filters.q || undefined,
    limit: page.limit,
    cursor: page.cursor ?? undefined,
  });
}

/**
 * `GET /admin/users/:id`. **Not a pure read:** every call writes a `VIEW_USER_PROFILE` history
 * entry (BFF B13). Only `adminProfileQuery` may call it, and never from a prefetch.
 */
export function fetchAdminUserProfile(id: number) {
  return apiClient.get<AdminUserProfile>(`/admin/users/${id}`);
}

/**
 * The profile query (W16): fetched once per opening of the page and never again on its own: no
 * refetch on focus, reconnect, mount or interval, no retry, and dropped from the cache as soon
 * as the page unmounts (`gcTime: 0`), so the next visit fetches (and records) once more. The only
 * other fetch is an explicit `refetch()` after a write that changes the profile (VRT-29).
 */
export function adminProfileQuery(id: number) {
  return queryOptions({
    queryKey: adminKeys.profile(id),
    queryFn: () => fetchAdminUserProfile(id),
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchInterval: false,
    retry: false,
  });
}

export function fetchAdminActions(filters: AdminActionFilters, page: PageRequest) {
  return apiClient.get<AdminActionPage>("/admin/actions", {
    adminId: filters.adminId,
    action: filters.action,
    targetUserId: filters.targetUserId,
    limit: page.limit,
    cursor: page.cursor ?? undefined,
  });
}

export function fetchAdminActionAdmins() {
  return apiClient.get<AdminActionAdmins>("/admin/actions/admins");
}
