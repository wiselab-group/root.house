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

/** Empty years may shrink to this share of the base scale to make room
 *  for a dense stretch before the whole axis has to grow wider. */
const MIN_SCALE_SHARE = 0.5;

/**
 * Places the «Линия жизни» dots so no two labels on the same side overlap.
 * Years map linearly at the base scale (`minWidth` px over the whole span);
 * where events are denser than their labels allow — nine daughters born
 * three years apart on a 95-year life — that stretch is widened just
 * enough, and every later year shifts right by the same amount. To pay for
 * it, the empty years around shrink first (down to MIN_SCALE_SHARE of the
 * base), so the whole life usually still fits in `minWidth` — birth and
 * death both on screen, busy decades zoomed in. Only when that isn't
 * enough does the axis grow past `minWidth`, and the track scrolls then.
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
  // The end dots sit LABEL_INSET in from the track edges — the label box
  // anchored to them reaches exactly to the edge.
  const basePxPerYear =
    (minWidth - 2 * LABEL_INSET) / Math.max(endYear - startYear, 1);
  const place = (pxPerYear: number) =>
    placeDots(labels, startYear, endYear, pxPerYear);

  let placed = place(basePxPerYear);
  if (placed.naturalWidth > minWidth) {
    // Largest scale for the empty years that still fits — naturalWidth
    // only grows with the scale, so bisect between the floor and the base.
    let low = basePxPerYear * MIN_SCALE_SHARE;
    let high = basePxPerYear;
    placed = place(low);
    for (let i = 0; i < 24 && placed.naturalWidth <= minWidth; i++) {
      const mid = (low + high) / 2;
      const candidate = place(mid);
      if (candidate.naturalWidth <= minWidth) {
        low = mid;
        placed = candidate;
      } else {
        high = mid;
      }
    }
  }
  const { xs, endX, naturalWidth } = placed;

  // Rounded to whole px (the track's CSS min-width); positions below are
  // percentages of this same rounded width. The epsilon keeps float noise
  // (660.0000001) from adding a phantom pixel.
  const width = Math.ceil(Math.max(minWidth, naturalWidth) - 1e-6);

  // Year → x through the placed dots (piecewise linear), so the decade
  // ticks follow the same stretched scale as the dots around them.
  const anchors: [number, number][] = labels.map((label, i) => [
    label.year,
    xs[i],
  ]);
  if (anchors.length === 0 || anchors[anchors.length - 1][0] < endYear) {
    anchors.push([endYear, endX]);
  }
  const positionOf = (year: number) => {
    let x = anchors[0][1];
    for (let i = 1; i < anchors.length; i++) {
      const [y0, x0] = anchors[i - 1];
      const [y1, x1] = anchors[i];
      if (year <= y1) {
        x = y1 === y0 ? x1 : x0 + ((year - y0) / (y1 - y0)) * (x1 - x0);
        break;
      }
      x = x1;
    }
    return (x / width) * 100;
  };

  return {
    width,
    positions: xs.map((x) => (x / width) * 100),
    positionOf,
  };
}

/**
 * One pass left to right at a given scale for the empty years: each dot at
 * its linear x plus whatever earlier dense stretches already pushed, or
 * further right if its label would touch the previous one on its side.
 */
function placeDots(
  labels: LifelineScaleLabel[],
  startYear: number,
  endYear: number,
  pxPerYear: number,
): { xs: number[]; endX: number; naturalWidth: number } {
  const linear = (year: number) => LABEL_INSET + (year - startYear) * pxPerYear;

  const xs: number[] = [];
  let shift = 0;
  labels.forEach((label, index) => {
    const [left] = extent(label);
    let x = Math.max(linear(label.year) + shift, -left);
    if (index > 0) x = Math.max(x, xs[index - 1] + DOT_GAP);
    const previous = lastIndexOnSide(labels, index);
    if (previous !== -1) {
      const [, previousRight] = extent(labels[previous]);
      x = Math.max(x, xs[previous] + previousRight + LABEL_GAP - left);
    }
    xs.push(x);
    shift = x - linear(label.year);
  });

  const endX = Math.max(linear(endYear) + shift, xs[xs.length - 1] ?? 0);
  const lastLabelRight =
    xs.length > 0
      ? xs[xs.length - 1] + extent(labels[labels.length - 1])[1]
      : 0;
  return {
    xs,
    endX,
    naturalWidth: Math.max(endX + LABEL_INSET, lastLabelRight),
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
