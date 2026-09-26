export interface LifelineScaleLabel {
  year: number;
  side: "up" | "down";
  /** Rendered label width in px (year + caption, padding included). */
  width: number;
  /** Where the label hangs off its dot: the first one grows rightwards from
   *  the axis start, one sitting on the axis end grows leftwards. */
  align: "start" | "center" | "end";
}

export interface LifelineScale {
  /** The narrowest track (px) on which no two labels touch. Any wider
   *  track works too — the scale only gets roomier — so the track fills
   *  its container and scrolls sideways only below this width. */
  minWidth: number;
  /** Each label's dot as a fraction (0–1) of the axis span, in input order. */
  fractions: number[];
  /** Any year inside the span, as a fraction — for the decade ticks. */
  fractionOf: (year: number) => number;
}

/** How far the label box reaches past its dot for start/end-aligned labels
 *  (its own px-1.5 padding, pulled back by -ml-1.5/-mr-1.5) — and so how
 *  far the end dots sit in from the track edges. */
export const LIFELINE_INSET = 6;
/** Two neighbouring dots (opposite sides) never touch — an 11px dot plus
 *  air. Their labels sit on opposite sides of the axis, and the label is
 *  the tap target, so the dots themselves can sit close. */
const DOT_GAP = 14;
/** Air between two labels on the same side of the axis. */
const LABEL_GAP = 10;
/** The decade ticks («1950 1960») stay readable apart — ~28px of text. */
const MIN_PX_PER_DECADE = 40;

/**
 * Picks the «Линия жизни» scale: one px-per-year for the whole axis, so a
 * decade is the same length everywhere (explicit user request — an earlier
 * version stretched only the busy years and squeezed the empty ones, which
 * made the decade ticks uneven).
 *
 * Returns the smallest scale at which no two same-side labels touch, no
 * dots overlap and no label hangs past the track — as a minimum width —
 * and every position as a fraction of the span. The track then simply
 * fills its container (user request: a short life with few events fits
 * without scrolling) and only scrolls sideways when the container is
 * narrower than that minimum — nine daughters born three years apart on a
 * 95-year life.
 */
export function layoutLifelineScale({
  labels,
  startYear,
  endYear,
}: {
  labels: LifelineScaleLabel[];
  startYear: number;
  endYear: number;
}): LifelineScale {
  const span = Math.max(endYear - startYear, 1);
  let pxPerYear = MIN_PX_PER_DECADE / 10;

  labels.forEach((label, index) => {
    const [left, right] = extent(label);
    // A centered label near either end must not hang past the track.
    const fromStart = label.year - startYear;
    if (fromStart > 0) {
      pxPerYear = Math.max(pxPerYear, (-left - LIFELINE_INSET) / fromStart);
    }
    const fromEnd = endYear - label.year;
    if (fromEnd > 0) {
      pxPerYear = Math.max(pxPerYear, (right - LIFELINE_INSET) / fromEnd);
    }
    if (index > 0) {
      const years = label.year - labels[index - 1].year;
      if (years > 0) pxPerYear = Math.max(pxPerYear, DOT_GAP / years);
    }
    const previous = lastIndexOnSide(labels, index);
    if (previous !== -1) {
      const years = label.year - labels[previous].year;
      const needed = extent(labels[previous])[1] + LABEL_GAP - left;
      if (years > 0) pxPerYear = Math.max(pxPerYear, needed / years);
    }
  });

  const fractionOf = (year: number) => (year - startYear) / span;
  return {
    minWidth: Math.ceil(span * pxPerYear + 2 * LIFELINE_INSET - 1e-6),
    fractions: labels.map((label) => fractionOf(label.year)),
    fractionOf,
  };
}

/** The label's horizontal reach relative to its dot, [left, right] in px. */
function extent(label: LifelineScaleLabel): [number, number] {
  if (label.align === "start") {
    return [-LIFELINE_INSET, label.width - LIFELINE_INSET];
  }
  if (label.align === "end") {
    return [-(label.width - LIFELINE_INSET), LIFELINE_INSET];
  }
  return [-label.width / 2, label.width / 2];
}

function lastIndexOnSide(labels: LifelineScaleLabel[], index: number): number {
  for (let i = index - 1; i >= 0; i--) {
    if (labels[i].side === labels[index].side) return i;
  }
  return -1;
}
