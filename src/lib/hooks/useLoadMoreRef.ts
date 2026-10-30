"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * A ref for a sentinel at the end of a list: `onVisible` runs whenever it scrolls into view (also
 * inside a scrolling dialog: the observer sees through ancestor clipping) while `enabled`.
 */
export function useLoadMoreRef(onVisible: () => void, enabled: boolean) {
  const callback = useRef(onVisible);
  useEffect(() => {
    callback.current = onVisible;
  });
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => () => observer.current?.disconnect(), []);

  return useCallback(
    (node: HTMLElement | null) => {
      observer.current?.disconnect();
      observer.current = null;
      if (!node || !enabled || typeof IntersectionObserver === "undefined") return;
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) callback.current();
        },
        { rootMargin: "200px" },
      );
      observer.current.observe(node);
    },
    [enabled],
  );
}
