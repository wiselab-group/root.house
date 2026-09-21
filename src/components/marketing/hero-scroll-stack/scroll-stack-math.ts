/**
 * Pure scroll-progress math for the stacking effect — testable without a
 * React test renderer or a real DOM scroll container (this repo's Vitest
 * setup has no jsdom/RTL).
 *
 * `progress` is 0..1 across the whole sticky section. Each of `cardCount`
 * cards owns an equal slice of that range. A card only transitions during
 * the first/last `TRANSITION_FRACTION` of its own slice — the middle holds
 * fully settled — so only one card is ever meaningfully visible/legible at
 * a time instead of two overlapping cards' text both being readable
 * mid-transition.
 */
const TRANSITION_FRACTION = 0.35;

export function cardTransformForProgress(
  progress: number,
  cardIndex: number,
  cardCount: number,
): { scale: number; opacity: number; translateY: number } {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const sliceSize = 1 / cardCount;
  const sliceStart = cardIndex * sliceSize;
  const local = Math.min(Math.max((clamped - sliceStart) / sliceSize, 0), 1);

  const isUpcoming = clamped < sliceStart;
  const isPast = clamped > sliceStart + sliceSize;

  if (isUpcoming) {
    return { scale: 0.92, opacity: 0, translateY: 24 };
  }
  if (isPast) {
    return { scale: 0.94, opacity: 0, translateY: -16 };
  }

  if (local < TRANSITION_FRACTION) {
    // Entering: ease in over the first slice of the fraction.
    const t = local / TRANSITION_FRACTION;
    return { scale: 0.92 + t * 0.08, opacity: t, translateY: 24 * (1 - t) };
  }
  if (local > 1 - TRANSITION_FRACTION) {
    // Exiting: ease out over the last slice of the fraction.
    const t = (local - (1 - TRANSITION_FRACTION)) / TRANSITION_FRACTION;
    return { scale: 1 - t * 0.06, opacity: 1 - t, translateY: -16 * t };
  }
  // Settled in the middle of its slice — fully visible, static.
  return { scale: 1, opacity: 1, translateY: 0 };
}

/** Which card slice the current progress falls in — drives the progress
 *  indicator dots. */
export function activeCardIndex(progress: number, cardCount: number): number {
  const clamped = Math.min(Math.max(progress, 0), 1);
  return Math.min(Math.floor(clamped * cardCount), cardCount - 1);
}
