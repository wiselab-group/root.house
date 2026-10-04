"use client";

import { useRef } from "react";

const OPEN_AFTER = 8;
const CLOSE_AFTER = 56;

/**
 * Touch swipes on the map's bottom sheet, the way native sheets behave:
 * up opens it (a peeking sheet hides its lower rows off-screen, so the
 * list has to open before it can scroll there); down — when the list is
 * already at its top — closes it, or dismisses a detail back to the
 * overview. The list scrolls normally otherwise.
 */
export function useSheetSwipe({
  expanded,
  setExpanded,
  onDismiss,
}: {
  expanded: boolean;
  setExpanded: (open: boolean) => void;
  /** A swipe down on a sheet that is not opened by hand; null = stays. */
  onDismiss: (() => void) | null;
}) {
  const start = useRef<{ y: number; atTop: boolean } | null>(null);

  const listAtTop = (target: EventTarget) => {
    const list = (target as HTMLElement).closest<HTMLElement>(
      "[data-panel-scroll]",
    );
    return !list || list.scrollTop <= 0;
  };

  return {
    onTouchStart: (event: React.TouchEvent) => {
      start.current = {
        y: event.touches[0].clientY,
        atTop: listAtTop(event.target),
      };
    },
    onTouchMove: (event: React.TouchEvent) => {
      if (!start.current || expanded) return;
      if (event.touches[0].clientY - start.current.y < -OPEN_AFTER)
        setExpanded(true);
    },
    onTouchEnd: (event: React.TouchEvent) => {
      const from = start.current;
      start.current = null;
      if (!from?.atTop) return;
      const dy = event.changedTouches[0].clientY - from.y;
      if (dy < CLOSE_AFTER) return;
      if (expanded) setExpanded(false);
      else onDismiss?.();
    },
  };
}
