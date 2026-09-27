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

/** The hero's first and last keywords hold still for a while at either end
 *  of the scroll, so the page neither starts nor ends mid-roll. */
const KEYWORD_HOLD_START = 0.08;
const KEYWORD_HOLD_END = 0.22;

/** Fractional index of the keyword in focus: 0 = first, count - 1 = last. */
export function keywordPosition(progress: number, count: number): number {
  const rolling = windowProgress(
    progress,
    KEYWORD_HOLD_START,
    1 - KEYWORD_HOLD_START - KEYWORD_HOLD_END,
  );
  return rolling * (count - 1);
}

/** `distance` = keyword index minus the focus position: negative words
 *  have rolled past (fade out fast), positive ones are still to come (the
 *  next one stays faintly visible). */
export function keywordOpacity(distance: number): number {
  if (distance <= 0) return clamp01(1 + distance * 1.6);
  return clamp01(1 - distance * 0.8);
}

/** Memory box: fragments start travelling one after another rather than
 *  all at once, and every one has landed by FRAGMENTS_DONE_AT. */
const FRAGMENTS_START_AT = 0.08;
const FRAGMENTS_DONE_AT = 0.78;
const FRAGMENT_SPAN = 0.4;

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

/** Connector lines draw in only once every card has landed. */
export function connectorOpacity(progress: number): number {
  return windowProgress(progress, FRAGMENTS_DONE_AT, 0.12);
}
