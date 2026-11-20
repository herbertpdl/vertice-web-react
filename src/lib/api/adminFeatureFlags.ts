import type { QueryClient } from "@tanstack/react-query";
import { adminKeys } from "./admin";
import { apiClient } from "./client";
import type { FeatureFlag, FeatureFlagList } from "./types";

/**
 * The admin feature-flag routes (feature-flags spec §3; BFF FF7). Every write sends an absolute
 * state, never a toggle (D5), and answers the updated flag, which the page uses only for its toast:
 * the list is refreshed by `settleAfterWrite`, never edited by hand (D4). No write takes a reason
 * and none records a history entry (D13). An unknown key is 404 `NOT_FOUND` (the flag was removed).
 */

/** The body of both `PUT`s: the state to save, `{ enabled }` and nothing else (BFF FF8). */
type FeatureFlagState = Pick<FeatureFlag, "enabled">;

const flagPath = (key: string) => `/admin/feature-flags/${encodeURIComponent(key)}`;

/** `GET /admin/feature-flags`: every flag, by key, each with its user settings inline. */
export function fetchFeatureFlags() {
  return apiClient.get<FeatureFlagList>("/admin/feature-flags");
}

/** `PUT /admin/feature-flags/:key/everyone`: the flag's state for everyone with no own setting. */
export function setFeatureFlagEveryone(key: string, enabled: boolean) {
  const body: FeatureFlagState = { enabled };
  return apiClient.put<FeatureFlag>(`${flagPath(key)}/everyone`, body);
}

/** `PUT /admin/feature-flags/:key/users/:userId`: adds or replaces one user's own setting. */
export function setFeatureFlagUser(key: string, userId: number, enabled: boolean) {
  const body: FeatureFlagState = { enabled };
  return apiClient.put<FeatureFlag>(`${flagPath(key)}/users/${userId}`, body);
}

/** `DELETE /admin/feature-flags/:key/users/:userId`: the user follows "everyone" again (200, idempotent). */
export function removeFeatureFlagUser(key: string, userId: number) {
  return apiClient.delete<FeatureFlag>(`${flagPath(key)}/users/${userId}`);
}

const MAX_REFETCHES = 3;
/** How long a paused (offline) query may hold a save's pending state after the write succeeded. */
export const PAUSED_DEADLINE_MS = 10_000;

/**
 * After a flag write succeeded (or answered `NOT_FOUND`): invalidates the list and resolves once a
 * fetch that started after the write has landed, so a switch never re-enables showing its old
 * state (D4, §7). Every pass either waits for a real event or returns, so it can't spin. Exits:
 * fresh data or an error after the write; the query gone; a refetch after which nothing moved and
 * nothing is fetching; `MAX_REFETCHES` refetches; paused (offline, or a retry waiting for focus or
 * the network) past `PAUSED_DEADLINE_MS`.
 */
export async function settleAfterWrite(queryClient: QueryClient) {
  const queryKey = adminKeys.featureFlags();
  const issuedAt = Date.now(); // after the write's response: the server has committed
  const deadline = issuedAt + PAUSED_DEADLINE_MS;
  const listHash = queryClient.getQueryCache().find({ queryKey, exact: true })?.queryHash;
  const invalidated = queryClient.invalidateQueries({ queryKey, exact: true });
  await (listHash ? untilPausedOrDone(queryClient, listHash, invalidated) : invalidated);
  for (let refetches = 0; ; ) {
    // Gone (the page unmounted and it was collected, or sign-out's `queryClient.clear()`).
    const query = queryClient.getQueryCache().find({ queryKey, exact: true });
    if (!query) return;
    const before = query.state;
    if (before.dataUpdatedAt > issuedAt || before.errorUpdatedAt > issuedAt) return;
    if (before.fetchStatus === "paused") {
      // Offline: refetchQueries would resolve at once without fetching. Wait for the query to move.
      const remaining = deadline - Date.now();
      if (remaining <= 0) return; // the write is saved; the reconnect refetch corrects the row
      const woke = await Promise.race([
        nextUpdate(queryClient, query.queryHash).then(() => true),
        delay(remaining).then(() => false),
      ]);
      if (!woke) return;
      continue;
    }
    if (refetches === MAX_REFETCHES) return;
    refetches += 1;
    await untilPausedOrDone(
      queryClient,
      query.queryHash,
      queryClient.refetchQueries({ queryKey, exact: true }, { cancelRefetch: false }),
    );
    const after = query.state;
    const moved = after.dataUpdatedAt !== before.dataUpdatedAt || after.errorUpdatedAt !== before.errorUpdatedAt;
    if (!moved && after.fetchStatus === "idle") return; // nothing ran and nothing will
  }
}

/**
 * Resolves when `promise` settles or this query's fetch pauses, whichever comes first. A fetch that
 * pauses inside its retry (`retry: 1`: the first attempt failed, then the browser went offline or
 * lost focus) keeps the very promise `invalidateQueries`/`refetchQueries` returned pending until it
 * resumes, so awaiting it alone could hang; the loop's next pass then reaches the paused branch
 * and its deadline instead.
 */
function untilPausedOrDone(queryClient: QueryClient, queryHash: string, promise: Promise<unknown>): Promise<void> {
  return new Promise((resolve) => {
    let unsubscribe = () => {};
    const finish = () => {
      unsubscribe();
      resolve();
    };
    unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryHash === queryHash && event.query.state.fetchStatus === "paused") finish();
    });
    if (queryClient.getQueryCache().get(queryHash)?.state.fetchStatus === "paused") finish();
    promise.then(finish, finish);
  });
}

/** Resolves after `ms` (a plain `setTimeout`, so fake timers drive it in tests). */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resolves on this query's next `updated` (or `removed`) cache event. */
function nextUpdate(queryClient: QueryClient, queryHash: string): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryHash !== queryHash) return;
      if (event.type === "updated" || event.type === "removed") {
        unsubscribe();
        resolve();
      }
    });
  });
}
