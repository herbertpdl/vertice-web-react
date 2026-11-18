"use client";

import { useReducer, useState } from "react";
import type { AdminPageSize } from "@/lib/api/types";
import {
  currentCursor,
  cursorPagesReducer,
  DEFAULT_PAGE_SIZE,
  initialCursorPages,
  pageIndex,
} from "@/lib/cursorPages";

/**
 * The cursor stack of one admin table (admin-panel spec W14), over the pure reducer in
 * `src/lib/cursorPages.ts`. `filtersKey` is any string that changes when the filters do (e.g. the
 * JSON of the filter object): a new value starts again at page 1, during render, so the old
 * cursor never reaches a request with the new filters. The stack lives in component state; the
 * filters themselves live in the URL.
 */
export function useCursorPages(filtersKey: string, initialPageSize: AdminPageSize = DEFAULT_PAGE_SIZE) {
  const [state, dispatch] = useReducer(cursorPagesReducer, initialPageSize, initialCursorPages);
  const [seenFilters, setSeenFilters] = useState(filtersKey);

  // React's "adjust state while rendering" pattern: no effect, so no request with a stale cursor.
  let effective = state;
  if (seenFilters !== filtersKey) {
    setSeenFilters(filtersKey);
    dispatch({ type: "reset" });
    effective = cursorPagesReducer(state, { type: "reset" });
  }

  return {
    pageSize: effective.pageSize,
    cursor: currentCursor(effective),
    pageIndex: pageIndex(effective),
    hasPrev: pageIndex(effective) > 0,
    next: (nextCursor: string | null) => dispatch({ type: "next", nextCursor }),
    prev: () => dispatch({ type: "prev" }),
    setPageSize: (pageSize: AdminPageSize) => dispatch({ type: "pageSize", pageSize }),
  };
}
