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
  /** The axis length in px the labels need — the track's minimum width. */
  width: number;
  /** Px per year — one scale for the whole axis. */
  pxPerYear: number;
  /** Each label's dot, in percent of `width`, in input order. */
  positions: number[];
  /** Any year inside the span, in percent — for the decade ticks. */
  positionOf: (year: number) => number;
}

/** How far the label box reaches past its dot for start/end-aligned labels
 *  (its own px-1.5 padding, pulled back by -ml-1.5/-mr-1.5). */
const LABEL_INSET = 6;
/** Two neighbouring dots (opposite sides) stay at least a tap apart. */
const DOT_GAP = 22;
/** Air between two labels on the same side of the axis. */
const LABEL_GAP = 10;

/**
 * Picks the «Линия жизни» scale: one px-per-year for the whole axis, so a
 * decade is the same length everywhere (explicit user request — an earlier
 * version stretched only the busy years and squeezed the empty ones, which
 * made the decade ticks uneven). The scale is the base one (`minWidth` px
 * over the whole span) unless some pair of labels on the same side would
 * touch — nine daughters born three years apart on a 95-year life — then
 * it's the smallest scale that parts every such pair, and the track grows
 * wider than `minWidth` and scrolls sideways.
 */
export function layoutLifelineScale({
  labels,
  startYear,
  endYear,
  minWidth,
}: {
  labels: LifelineScaleLabel[];
  startYear: number;
  endYear: number;
  minWidth: number;
}): LifelineScale {
  const span = Math.max(endYear - startYear, 1);
  // The end dots sit LABEL_INSET in from the track edges — the label box
  // anchored to them reaches exactly to the edge.
  let pxPerYear = (minWidth - 2 * LABEL_INSET) / span;

  labels.forEach((label, index) => {
    const [left] = extent(label);
    // A centered label near the axis start must not hang past the track.
    const fromStart = label.year - startYear;
    if (fromStart > 0) {
      pxPerYear = Math.max(pxPerYear, (-left - LABEL_INSET) / fromStart);
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

  const xOf = (year: number) => LABEL_INSET + (year - startYear) * pxPerYear;
  const endX = xOf(endYear);
  const last = labels[labels.length - 1];
  const lastLabelRight = last ? xOf(last.year) + extent(last)[1] : 0;
  // Rounded to whole px (the track's CSS min-width); positions below are
  // percentages of this same rounded width. The epsilon keeps float noise
  // (660.0000001) from adding a phantom pixel.
  const width = Math.ceil(
    Math.max(minWidth, endX + LABEL_INSET, lastLabelRight) - 1e-6,
  );
  const positionOf = (year: number) => (xOf(year) / width) * 100;

  return {
    width,
    pxPerYear,
    positions: labels.map((label) => positionOf(label.year)),
    positionOf,
  };
}

/** The label's horizontal reach relative to its dot, [left, right] in px. */
function extent(label: LifelineScaleLabel): [number, number] {
  if (label.align === "start") return [-LABEL_INSET, label.width - LABEL_INSET];
  if (label.align === "end") return [-(label.width - LABEL_INSET), LABEL_INSET];
  return [-label.width / 2, label.width / 2];
}

function lastIndexOnSide(labels: LifelineScaleLabel[], index: number): number {
  for (let i = index - 1; i >= 0; i--) {
    if (labels[i].side === labels[index].side) return i;
  }
  return -1;
}
