"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * How many chips, taken from the start, fit in `available` px on one line.
 * If not all of them fit, room is kept for the «+N» chip after them.
 */
export function fitChipCount(
  widths: number[],
  moreWidth: number,
  available: number,
  gap: number,
): number {
  let used = 0;
  const ends = widths.map((width, i) => (used += width + (i > 0 ? gap : 0)));
  if (widths.length === 0 || ends[widths.length - 1] <= available) {
    return widths.length;
  }
  for (let count = widths.length - 1; count > 0; count--) {
    if (ends[count - 1] + gap + moreWidth <= available) return count;
  }
  return 0;
}

/**
 * Fit-to-width for the lightbox's name chips (LightboxPeopleFit). The
 * chips are measured in a hidden copy of the row (`measureRef`: every chip,
 * then one «+N» sample as the last child), so hiding a chip never changes
 * what's measured. Re-runs when the row's box or the names' own size
 * changes — a late web-font swap widens every name.
 */
export function useChipFit(signature: string, gap: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<number | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;
    const compute = () => {
      const items = Array.from(measure.children) as HTMLElement[];
      const more = items.pop();
      setVisible(
        fitChipCount(
          items.map((item) => item.offsetWidth),
          more?.offsetWidth ?? 0,
          container.clientWidth,
          gap,
        ),
      );
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(container);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [signature, gap]);

  return { containerRef, measureRef, visible };
}
