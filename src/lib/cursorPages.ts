import type { AdminPageSize } from "@/lib/api/types";

/**
 * Cursor paging for the admin tables (admin-panel spec W14). The BFF pages by `limit` and an
 * opaque `cursor` (the previous page's `nextCursor`, valid only with the same filters) and sends
 * no totals, so the only way back is to remember the cursors already used: `stack[i]` is the
 * cursor that fetched page `i` (`null` for the first page). Changing the filters or the page size
 * starts again at page 1, because an old cursor means nothing under new filters.
 */

export const PAGE_SIZES: readonly AdminPageSize[] = [10, 25, 50];
export const DEFAULT_PAGE_SIZE: AdminPageSize = 25;

export interface CursorPagesState {
  pageSize: AdminPageSize;
  stack: (string | null)[];
}

export type CursorPagesAction =
  | { type: "next"; nextCursor: string | null }
  | { type: "prev" }
  | { type: "pageSize"; pageSize: AdminPageSize }
  | { type: "reset" };

export function initialCursorPages(pageSize: AdminPageSize = DEFAULT_PAGE_SIZE): CursorPagesState {
  return { pageSize, stack: [null] };
}

export function cursorPagesReducer(
  state: CursorPagesState,
  action: CursorPagesAction,
): CursorPagesState {
  switch (action.type) {
    case "next":
      // The last page has no next cursor: stay put rather than refetch page 1.
      if (action.nextCursor === null) return state;
      return { ...state, stack: [...state.stack, action.nextCursor] };
    case "prev":
      if (state.stack.length <= 1) return state;
      return { ...state, stack: state.stack.slice(0, -1) };
    case "pageSize":
      if (action.pageSize === state.pageSize) return state;
      return initialCursorPages(action.pageSize);
    case "reset":
      return state.stack.length === 1 ? state : initialCursorPages(state.pageSize);
  }
}

/** The cursor of the page on screen (`null` on page 1). */
export function currentCursor(state: CursorPagesState): string | null {
  return state.stack[state.stack.length - 1];
}

/** 0 for the first page. */
export function pageIndex(state: CursorPagesState): number {
  return state.stack.length - 1;
}

/**
 * The rows on screen as "11–20" (1-based, inclusive), or `null` when the page is empty. Every page
 * before this one was full (a short page is the last one), so the offset is `index × size`.
 */
export function rowRange(
  index: number,
  pageSize: number,
  rowCount: number,
): { from: number; to: number } | null {
  if (rowCount <= 0) return null;
  const from = index * pageSize + 1;
  return { from, to: from + rowCount - 1 };
}
