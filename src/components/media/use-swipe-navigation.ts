import { useRef, useState } from "react";

/** Below this, a drag reads as a click/scroll, not an intentional swipe. */
const SWIPE_THRESHOLD_PX = 60;
/** Must match the track's `duration-*` class in LightboxCarouselTrack. */
export const SWIPE_SETTLE_MS = 220;

/**
 * Swipe (touch) or click-drag (mouse/trackpad) left/right to step an index
 * back and forth. Drives a real sliding-track carousel (prev/current/next
 * slides side by side, whole track translated) rather than swapping one
 * `<img src>` in place: an `<img>` swap needs the new image decoded before
 * it paints, so between "drag released" and "new photo visible" there was a
 * blank gap, then the photo popped in — not how any real carousel behaves
 * (user-reported after testing the touch/mouse-drag build). A three-slide
 * track sidesteps that entirely: the neighbor is already mounted and
 * positioned off-screen, so "settle the drag" and "the photo slides into
 * place" are the same motion, and the index only changes once that slide
 * has visibly finished — see `settleUnits`/`onSettleTransitionEnd` below.
 *
 * Returns:
 * - `dragOffsetPx` — px to translate the track by *during* an active drag
 *   (follows the pointer 1:1, with edge resistance past the first/last
 *   photo)
 * - `settleUnits` — after release, how many whole slide-widths (`-1`, `0`,
 *   or `1`) the track animates to before the index actually changes: `0`
 *   is a spring back (drag didn't clear the threshold), `±1` slides fully
 *   to the neighbor (drag cleared it). A unit count, not a pixel value, so
 *   the caller composes it into its own `calc(-100% + settleUnits * 100%)`
 *   transform — no need to measure anything in JS (React Compiler also
 *   forbids mutating a ref this hook returns from outside the hook, which
 *   an earlier px-based version relied on).
 * - `suppressTransition` — true for exactly the render where the index has
 *   just been committed and `settleUnits` resets back to `0`. The caller
 *   MUST skip its CSS transition on that render (e.g. render twice: once
 *   with the transition off at the reset position, then let the next
 *   frame re-enable it) — otherwise the browser animates the jump from
 *   "translated a full slide-width to the neighbor" back to "translated
 *   zero, now-current slide centered," which visibly flies the just-
 *   arrived photo back off-screen before snapping to rest (real bug,
 *   caught on a live swipe test: "when the swipe ends this photo flies
 *   off-screen again"). `isDragging` alone doesn't cover this — dragging
 *   is already false by the time this fires.
 * - `isDragging` — true only while a drag is live; the caller should skip
 *   its own CSS transition during this window too, so the track tracks
 *   the pointer without lag.
 * - `onSettleTransitionEnd` — call from the track's `onTransitionEnd` once
 *   `settleUnits` is non-zero and its transition finishes; commits the
 *   index change.
 * - `pointerHandlers` — spread onto the swipeable element.
 *
 * dragStart is a ref, not state, since pointermove fires on every pixel of
 * drag — re-rendering that often would be wasteful; only dragOffsetPx/
 * settleUnits (needed for the visual transform) are state.
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
  const pendingDirection = useRef<"prev" | "next" | null>(null);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [settleUnits, setSettleUnits] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [suppressTransition, setSuppressTransition] = useState(false);

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
      setDragOffsetPx(0);
      return;
    }
    // Resist dragging past the first/last item instead of just refusing —
    // a small give reads as "you've hit the edge," a hard stop reads as broken.
    const clamped = (dx < 0 && !hasNext) || (dx > 0 && !hasPrev) ? dx / 3 : dx;
    setDragOffsetPx(clamped);
  }

  function endDrag(e: React.PointerEvent) {
    const start = dragStart.current;
    if (!start || start.pointerId !== e.pointerId) return;
    const offset = dragOffsetPx;
    setIsDragging(false);
    dragStart.current = null;

    if (offset <= -SWIPE_THRESHOLD_PX && hasNext) {
      pendingDirection.current = "next";
      setSettleUnits(-1);
    } else if (offset >= SWIPE_THRESHOLD_PX && hasPrev) {
      pendingDirection.current = "prev";
      setSettleUnits(1);
    } else {
      pendingDirection.current = null;
      setSettleUnits(0);
    }
    setDragOffsetPx(0);
  }

  /** Call when the track's settle transition finishes (onTransitionEnd). */
  function onSettleTransitionEnd() {
    const direction = pendingDirection.current;
    pendingDirection.current = null;
    if (!direction) return;
    // The track is currently translated a full slide-width to the
    // neighbor's slot. Committing the index change re-labels that same
    // slide "current" and resets settleUnits to 0 (back to the resting
    // -100% transform) — a no-op *position-wise* once the slides have
    // shifted, but the transition is still enabled on this render, so
    // without suppressing it the browser animates that reset and the
    // photo visibly flies back across the screen. suppressTransition
    // forces one instant (transition-less) render at the reset position;
    // the effect below re-enables the transition on the next frame, once
    // it's safe (nothing left to animate away from).
    setSuppressTransition(true);
    setSettleUnits(0);
    if (direction === "next") onNext();
    else onPrev();
  }

  /** Call after the DOM has committed the transition-less reset render. */
  function onSuppressedResetPainted() {
    setSuppressTransition(false);
  }

  return {
    dragOffsetPx,
    settleUnits,
    isDragging,
    suppressTransition,
    onSettleTransitionEnd,
    onSuppressedResetPainted,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
