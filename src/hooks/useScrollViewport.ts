import { useEffect, useMemo, useState } from "react";

export interface ScrollViewportResult<T> {
  scrollOffset: number;
  visibleItems: T[];
  setScrollOffset: (offset: number) => void;
  ensureIndexVisible: (index: number) => void;
}

export function useScrollViewport<T>(
  items: T[],
  visibleCount: number,
  cursorIndex: number,
): ScrollViewportResult<T> {
  const [scrollOffset, setScrollOffset] = useState(0);

  const maxOffset = Math.max(0, items.length - visibleCount);

  useEffect(() => {
    setScrollOffset(prev => Math.min(prev, maxOffset));
  }, [maxOffset]);

  useEffect(() => {
    if (cursorIndex < 0 || items.length === 0) return;

    setScrollOffset(prev => {
      if (cursorIndex < prev) return cursorIndex;
      if (cursorIndex >= prev + visibleCount) {
        return Math.min(cursorIndex - visibleCount + 1, maxOffset);
      }
      return prev;
    });
  }, [cursorIndex, items.length, visibleCount, maxOffset]);

  const visibleItems = useMemo(
    () => items.slice(scrollOffset, scrollOffset + visibleCount),
    [items, scrollOffset, visibleCount],
  );

  const ensureIndexVisible = (index: number) => {
    setScrollOffset(prev => {
      if (index < prev) return index;
      if (index >= prev + visibleCount) {
        return Math.min(index - visibleCount + 1, maxOffset);
      }
      return prev;
    });
  };

  return {
    scrollOffset,
    visibleItems,
    setScrollOffset,
    ensureIndexVisible,
  };
}
