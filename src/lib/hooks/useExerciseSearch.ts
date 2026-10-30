"use client";

import { useMemo } from "react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { exerciseSearch, exercisesQueryKey, fetchExercisesPage } from "@/lib/api/exercises";
import { useDebouncedValue } from "./useDebouncedValue";

/**
 * The paged exercise search behind the workout-editor picker and the catalog. It stays `idle`
 * (no request at all) until the search has 3 or more letters or a group is chosen, then loads
 * one page at a time: call `fetchNextPage` as the list nears its end. Rows are in server order.
 */
export function useExerciseSearch(search: string, muscleGroupId: number | null) {
  const debounced = useDebouncedValue(search, 300);
  const filter = exerciseSearch(debounced, muscleGroupId);
  const query = useInfiniteQuery({
    queryKey: exercisesQueryKey(filter),
    queryFn: ({ pageParam }) => fetchExercisesPage({ ...filter, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: filter.enabled,
    placeholderData: keepPreviousData,
  });
  const idle = !filter.enabled;
  // Disabled, the query would still hand back the previous filter's placeholder pages.
  const exercises = useMemo(
    () => (idle ? undefined : query.data?.pages.flatMap((page) => page.exercises)),
    [idle, query.data],
  );
  return { ...query, idle, exercises, filtered: filter };
}
