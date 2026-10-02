/**
 * Pure scroll-progress math for the landing's scroll-driven sections —
 * testable without a DOM (this repo's Vitest setup has no jsdom/RTL).
 * Every input `progress` is 0..1 through a tall sticky wrapper
 * (use-scroll-progress.ts).
 */

export function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/** Hermite ease-in-out — scroll-scrubbed motion has no CSS easing curve of
 *  its own, so the curve is applied to the progress value itself. */
export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** Progress within a sub-window [start, start + span] of the whole range. */
export function windowProgress(
  progress: number,
  start: number,
  span: number,
): number {
  return clamp01((progress - start) / span);
}

/** Scattered fragments (the problem section) start travelling one after
 *  another rather than all at once, and every one has arrived by DONE_AT. */
const FRAGMENTS_START_AT = 0.06;
const FRAGMENTS_DONE_AT = 0.7;
const FRAGMENT_SPAN = 0.32;

export function fragmentProgress(
  progress: number,
  index: number,
  count: number,
): number {
  const stagger =
    count > 1
      ? (FRAGMENTS_DONE_AT - FRAGMENTS_START_AT - FRAGMENT_SPAN) / (count - 1)
      : 0;
  return smoothstep(
    windowProgress(
      progress,
      FRAGMENTS_START_AT + index * stagger,
      FRAGMENT_SPAN,
    ),
  );
}

/** The gathered story card fades in once the last fragment is nearly in. */
export function gatheredProgress(progress: number): number {
  return smoothstep(windowProgress(progress, FRAGMENTS_DONE_AT - 0.06, 0.14));
}

/** First and last steps hold still for a while at either end of the
 *  scroll, so a section neither starts nor ends mid-change. */
const STEP_HOLD_START = 0.06;
const STEP_HOLD_END = 0.16;

/** Fractional index of the step in focus: 0 = first, count - 1 = last. */
export function stepPosition(progress: number, count: number): number {
  const moving = windowProgress(
    progress,
    STEP_HOLD_START,
    1 - STEP_HOLD_START - STEP_HOLD_END,
  );
  return moving * (count - 1);
}

export type Camera = { x: number; y: number; scale: number };

/** Camera between two neighbouring steps, eased so each step settles
 *  before the next one starts moving. */
export function cameraAt(cameras: readonly Camera[], position: number): Camera {
  const last = cameras.length - 1;
  const from = Math.min(Math.max(Math.floor(position), 0), last);
  const to = Math.min(from + 1, last);
  const t = smoothstep(position - from);
  const mix = (a: number, b: number) => a + (b - a) * t;
  return {
    x: mix(cameras[from].x, cameras[to].x),
    y: mix(cameras[from].y, cameras[to].y),
    scale: mix(cameras[from].scale, cameras[to].scale),
  };
}
