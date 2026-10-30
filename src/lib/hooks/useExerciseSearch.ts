"use client";

import { useEffect, useMemo, useRef } from "react";
import { hashKey, useInfiniteQuery } from "@tanstack/react-query";
import { exerciseSearch, exercisesQueryKey, fetchExercisesPage } from "@/lib/api/exercises";
import type { Exercise } from "@/lib/api/types";
import { useDebouncedValue } from "./useDebouncedValue";

/**
 * The paged exercise search behind the workout-editor picker and the catalog. It stays `idle`
 * (no request at all) until the search has 3 or more letters or a group is chosen, then loads
 * one page at a time: call `fetchNextPage` as the list nears its end. Rows are in server order.
 */
export function useExerciseSearch(search: string, muscleGroupId: number | null) {
  const debounced = useDebouncedValue(search, 300);
  const filter = exerciseSearch(debounced, muscleGroupId);
  const queryKey = exercisesQueryKey(filter);
  // The key whose rows were on screen last render. Only those rows may stand in while the next
  // filter loads: after the idle prompt, an older search's rows would pass as the new results.
  const shownKey = useRef<string | null>(null);
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchExercisesPage({ ...filter, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: filter.enabled,
    placeholderData: (previousData, previousQuery) =>
      previousQuery && hashKey(previousQuery.queryKey) === shownKey.current ? previousData : undefined,
  });
  const idle = !filter.enabled;
  useEffect(() => {
    // Idle shows no rows, even though the disabled query may still carry a placeholder.
    if (idle) shownKey.current = null;
    else if (!query.isPlaceholderData) shownKey.current = query.data ? hashKey(queryKey) : null;
  });
  const exercises = useMemo(() => (idle ? undefined : uniqueRows(query.data?.pages)), [idle, query.data]);
  return { ...query, idle, exercises };
}

/**
 * The pages' rows, each id once. Cursors are offsets (spec D2), so an exercise created between
 * two page loads can push the previous page's last row onto the next page as well.
 */
function uniqueRows(pages: { exercises: Exercise[] }[] | undefined): Exercise[] | undefined {
  if (!pages) return undefined;
  const seen = new Set<number>();
  return pages.flatMap((page) => page.exercises).filter((e) => !seen.has(e.id) && seen.add(e.id));
}
