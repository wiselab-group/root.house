import { describe, expect, it } from "vitest";
import {
  LIFELINE_INSET,
  layoutLifelineScale,
  type LifelineScaleLabel,
} from "./lifeline-scale";

function labelsFor(years: number[], width = 60): LifelineScaleLabel[] {
  return years.map((year, index) => ({
    year,
    side: index % 2 === 0 ? "up" : "down",
    width,
    align:
      index === 0 ? "start" : index === years.length - 1 ? "end" : "center",
  }));
}

/** Px edges of every label on a track `trackWidth` px wide — the same
 *  calc() PersonLifeline places the dots with. */
function labelBoxes(
  labels: LifelineScaleLabel[],
  fractions: number[],
  trackWidth: number,
) {
  return labels.map((label, i) => {
    const x = LIFELINE_INSET + fractions[i] * (trackWidth - 2 * LIFELINE_INSET);
    const [left, right] =
      label.align === "start"
        ? [x - LIFELINE_INSET, x - LIFELINE_INSET + label.width]
        : label.align === "end"
          ? [x + LIFELINE_INSET - label.width, x + LIFELINE_INSET]
          : [x - label.width / 2, x + label.width / 2];
    return { side: label.side, x, left, right };
  });
}

function expectNoOverlaps(
  labels: LifelineScaleLabel[],
  fractions: number[],
  trackWidth: number,
) {
  const boxes = labelBoxes(labels, fractions, trackWidth);
  for (const side of ["up", "down"] as const) {
    const row = boxes.filter((box) => box.side === side);
    for (let i = 1; i < row.length; i++) {
      expect(row[i].left).toBeGreaterThanOrEqual(row[i - 1].right - 1e-9);
    }
  }
  for (let i = 1; i < boxes.length; i++) {
    expect(boxes[i].x - boxes[i - 1].x).toBeGreaterThanOrEqual(14 - 1e-9);
  }
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(-1e-9);
    expect(box.right).toBeLessThanOrEqual(trackWidth + 1e-9);
  }
}

// Надежда Купчик (kupczyk): nine daughters 1953–1975 on a 95-year life.
const DENSE = [
  1930, 1953, 1955, 1958, 1961, 1964, 1967, 1970, 1973, 1975, 2025,
];

describe("layoutLifelineScale", () => {
  it("places dots by their share of the span", () => {
    const scale = layoutLifelineScale({
      labels: labelsFor([1869, 1900, 1938]),
      startYear: 1869,
      endYear: 1938,
    });
    expect(scale.fractions).toEqual([0, 31 / 69, 1]);
  });

  // The profile from the user's screenshot: 1988 → today, with a wedding
  // and a move in consecutive years — it used to force a 850px track.
  it("fits a sparse life into a regular column without scrolling", () => {
    // Widths as lifelineView estimates them: Рождение, Свадьба,
    // Переезд в Эстонию, Эва.
    const labels = labelsFor([1988, 2020, 2021, 2026]).map((label, i) => ({
      ...label,
      width: [68, 61, 131, 46][i],
    }));
    const scale = layoutLifelineScale({
      labels,
      startYear: 1988,
      endYear: 2026,
    });
    expect(scale.minWidth).toBeLessThanOrEqual(700);
    expectNoOverlaps(labels, scale.fractions, scale.minWidth);
  });

  it("needs a wider track when same-side labels crowd", () => {
    const labels = labelsFor(DENSE, 68);
    const scale = layoutLifelineScale({
      labels,
      startYear: 1930,
      endYear: 2025,
    });
    expect(scale.minWidth).toBeGreaterThan(700);
    expectNoOverlaps(labels, scale.fractions, scale.minWidth);
  });

  it("stays clear at any width above the minimum", () => {
    const labels = labelsFor(DENSE, 68);
    const scale = layoutLifelineScale({
      labels,
      startYear: 1930,
      endYear: 2025,
    });
    for (const extra of [1, 120, 900]) {
      expectNoOverlaps(labels, scale.fractions, scale.minWidth + extra);
    }
  });

  it("keeps decade ticks readable apart", () => {
    const scale = layoutLifelineScale({
      labels: labelsFor([1900, 1999], 40),
      startYear: 1900,
      endYear: 1999,
    });
    const pxPerDecade = ((scale.minWidth - 2 * LIFELINE_INSET) / 99) * 10;
    expect(pxPerDecade).toBeGreaterThanOrEqual(40 - 1e-9);
  });

  it("runs a living person's axis past the last event to today", () => {
    const scale = layoutLifelineScale({
      labels: labelsFor([1988, 2019]).map((label) => ({
        ...label,
        align: label.year === 1988 ? "start" : "center",
      })),
      startYear: 1988,
      endYear: 2026,
    });
    expect(scale.fractionOf(2026)).toBe(1);
    expect(scale.fractions[1]).toBeLessThan(1);
  });
});
