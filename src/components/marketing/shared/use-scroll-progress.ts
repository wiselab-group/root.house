import { useEffect, useRef, useState } from "react";

/**
 * Tracks scroll progress (0..1) through a tall wrapper element as the page
 * scrolls — the wrapper is several viewport-heights tall, and progress
 * reaches 1 once its bottom edge reaches the viewport bottom. Measured
 * from below the landing's sticky header (--marketing-header-h), where the
 * sticky viewport pins. Read via
 * rAF-throttled scroll/resize listeners (real CSS transforms driven by
 * state, not scroll-linked animation timelines — keeps `prefers-reduced-
 * motion` handling simple and consistent with the rest of the app).
 */
export function useScrollProgress(
  wrapperRef: React.RefObject<HTMLElement | null>,
) {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    function measure() {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      // The sticky viewport pins below the landing's header, not at 0.
      const top =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--marketing-header-h",
          ),
        ) || 0;
      const viewportHeight = window.innerHeight - top;
      const scrollableDistance = rect.height - viewportHeight;
      if (scrollableDistance <= 0) {
        setProgress(rect.top <= top ? 1 : 0);
        return;
      }
      const scrolled = top - rect.top;
      setProgress(Math.min(Math.max(scrolled / scrollableDistance, 0), 1));
    }

    function onScroll() {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        measure();
      });
    }

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [wrapperRef]);

  return progress;
}
