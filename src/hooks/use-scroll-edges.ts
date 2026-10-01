"use client";

import { useLayoutEffect, useRef, useState } from "react";

interface ScrollEdges {
  /** The content is wider than the scroller. */
  overflow: boolean;
  /** More content hides past the left / right edge. */
  moreStart: boolean;
  moreEnd: boolean;
}

const NONE: ScrollEdges = { overflow: false, moreStart: false, moreEnd: false };

/**
 * Where a horizontal scroller still has hidden content — drives the fade
 * masks (.mask-fade-start/-end) of LightboxPeopleScroller and the
 * profile's PersonLifeline, and the former's count chip. Updates on scroll and
 * when the scroller or its content changes size.
 */
export function useScrollEdges(signature: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<ScrollEdges>(NONE);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const next = {
        overflow: max > 1,
        moreStart: el.scrollLeft > 1,
        moreEnd: el.scrollLeft < max - 1,
      };
      setEdges((prev) =>
        prev.overflow === next.overflow &&
        prev.moreStart === next.moreStart &&
        prev.moreEnd === next.moreEnd
          ? prev
          : next,
      );
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [signature]);

  return { ref, ...edges };
}
