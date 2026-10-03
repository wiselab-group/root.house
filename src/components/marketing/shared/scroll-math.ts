/**
 * Pure scroll math for the landing — testable without a DOM (this repo's
 * Vitest setup has no jsdom/RTL).
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

/** Scattered fragments start travelling one after another almost as soon
 *  as the screen pins — a long still stretch at the start read as the
 *  scroll lagging — and every one has arrived by FRAGMENTS_DONE_AT. */
const FRAGMENTS_START_AT = 0.04;
const FRAGMENTS_DONE_AT = 0.72;
const FRAGMENT_SPAN = 0.36;

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

/** The gathered story card (and the answer) come in as the last
 *  fragments arrive, leaving only a short hold before the page moves on. */
export function gatheredProgress(progress: number): number {
  return smoothstep(windowProgress(progress, FRAGMENTS_DONE_AT - 0.1, 0.18));
}
