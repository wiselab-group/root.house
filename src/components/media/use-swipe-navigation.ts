import { useRef, useState } from "react";

/** Below this, a drag reads as a click/scroll, not an intentional swipe. */
const SWIPE_THRESHOLD_PX = 60;

/**
 * Swipe (touch) or click-drag (mouse/trackpad) left/right to step an index
 * back and forth — extracted out of PhotoLightbox to keep it under the
 * 150-line component limit, but generic enough for any future swipeable
 * carousel. Built on Pointer Events, not Touch Events: an earlier version
 * used onTouchStart/Move/End, which works on phones but never fires for a
 * mouse or trackpad drag, so desktop had no way to swipe at all (caught
 * live — a real desktop screenshot showing the gesture just not
 * responding). Pointer Events unify mouse/touch/pen behind one API, so the
 * same handlers drive both. `setPointerCapture` keeps the drag tracking
 * even if the cursor leaves the element mid-drag, which touch didn't need
 * (a finger drag stays "captured" by the browser automatically) but a
 * mouse drag does.
 *
 * Returns drag state for a follow-the-pointer transform plus the pointer
 * handlers to spread onto the swipeable element.
 *
 * dragStart is a ref, not state, since pointermove fires on every pixel of
 * drag — re-rendering that often would be wasteful; only dragOffset (needed
 * for the visual follow transform) is state, and even that only updates
 * once a drag is unambiguously horizontal (see onPointerMove).
 */
export function useSwipeNavigation({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  disabled = false,
}: {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  disabled?: boolean;
}) {
  const dragStart = useRef<{ x: number; y: number; pointerId: number } | null>(
    null,
  );
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  function onPointerDown(e: React.PointerEvent) {
    // Only the primary button for mouse; touch/pen have no button concept
    // (button is -1), so this doesn't restrict those.
    if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    dragStart.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    const start = dragStart.current;
    if (!start || start.pointerId !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    // Once it's clearly a vertical gesture (scroll/pinch), stop tracking as
    // a swipe rather than fighting the browser's own gesture handling.
    if (Math.abs(dy) > Math.abs(dx) + 10) {
      dragStart.current = null;
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    // Resist dragging past the first/last item instead of just refusing —
    // a small give reads as "you've hit the edge," a hard stop reads as broken.
    const clamped = (dx < 0 && !hasNext) || (dx > 0 && !hasPrev) ? dx / 3 : dx;
    setDragOffset(clamped);
  }

  function endDrag(e: React.PointerEvent) {
    const start = dragStart.current;
    if (!start || start.pointerId !== e.pointerId) return;
    const offset = dragOffset;
    setIsDragging(false);
    setDragOffset(0);
    dragStart.current = null;
    if (offset <= -SWIPE_THRESHOLD_PX && hasNext) {
      onNext();
    } else if (offset >= SWIPE_THRESHOLD_PX && hasPrev) {
      onPrev();
    }
  }

  return {
    dragOffset,
    isDragging,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
