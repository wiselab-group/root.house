import { describe, expect, it } from "vitest";
import { layoutLifelineScale, type LifelineScaleLabel } from "./lifeline-scale";

function labelsFor(years: number[], width = 60): LifelineScaleLabel[] {
  return years.map((year, index) => ({
    year,
    side: index % 2 === 0 ? "up" : "down",
    width,
    align:
      index === 0 ? "start" : index === years.length - 1 ? "end" : "center",
  }));
}

/** Px left/right edges of every label, grouped by side. */
function labelBoxes(
  labels: LifelineScaleLabel[],
  positions: number[],
  width: number,
) {
  return labels.map((label, i) => {
    const x = (positions[i] / 100) * width;
    const [left, right] =
      label.align === "start"
        ? [x - 6, x - 6 + label.width]
        : label.align === "end"
          ? [x + 6 - label.width, x + 6]
          : [x - label.width / 2, x + label.width / 2];
    return { side: label.side, left, right };
  });
}

describe("layoutLifelineScale", () => {
  it("keeps the base scale when labels have room", () => {
    const labels = labelsFor([1869, 1900, 1938]);
    const scale = layoutLifelineScale({
      labels,
      startYear: 1869,
      endYear: 1938,
      minWidth: 660,
    });
    expect(scale.width).toBe(660);
    expect(scale.positions[1]).toBeCloseTo((31 / 69) * 100, 0);
  });

  // Надежда Купчик (kupczyk): nine daughters 1953–1975 on a 95-year life —
  // on the plain 660px scale their names overlapped.
  it("spreads a dense stretch until same-side labels clear each other", () => {
    const years = [
      1930, 1953, 1955, 1958, 1961, 1964, 1967, 1970, 1973, 1975, 2025,
    ];
    const labels = labelsFor(years, 68);
    const scale = layoutLifelineScale({
      labels,
      startYear: 1930,
      endYear: 2025,
      minWidth: 660,
    });
    expect(scale.width).toBeGreaterThan(660);

    const boxes = labelBoxes(labels, scale.positions, scale.width);
    for (const side of ["up", "down"] as const) {
      const row = boxes.filter((box) => box.side === side);
      for (let i = 1; i < row.length; i++) {
        expect(row[i].left).toBeGreaterThanOrEqual(row[i - 1].right);
      }
    }
    for (const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(-1e-9);
      expect(box.right).toBeLessThanOrEqual(scale.width);
    }
  });

  it("keeps one scale for the whole axis — every decade the same length", () => {
    const years = [
      1930, 1953, 1955, 1958, 1961, 1964, 1967, 1970, 1973, 1975, 2025,
    ];
    const scale = layoutLifelineScale({
      labels: labelsFor(years, 68),
      startYear: 1930,
      endYear: 2025,
      minWidth: 660,
    });
    const px = (year: number) => (scale.positionOf(year) / 100) * scale.width;
    const decade = px(1950) - px(1940);
    for (const start of [1960, 1970, 1990, 2010]) {
      expect(px(start + 10) - px(start)).toBeCloseTo(decade);
    }
    expect(decade).toBeCloseTo(scale.pxPerYear * 10);
    expect(scale.pxPerYear).toBeGreaterThan((660 - 12) / 95);
  });

  it("places decade ticks on the same stretched scale as the dots", () => {
    const years = [1930, 1953, 1955, 1958, 1961, 2025];
    const scale = layoutLifelineScale({
      labels: labelsFor(years, 68),
      startYear: 1930,
      endYear: 2025,
      minWidth: 660,
    });
    const at = (year: number) => scale.positions[years.indexOf(year)];
    expect(scale.positionOf(1955)).toBeCloseTo(at(1955));
    expect(scale.positionOf(1960)).toBeGreaterThan(at(1958));
    expect(scale.positionOf(1960)).toBeLessThan(at(1961));
  });

  it("runs a living person's axis past the last event to today", () => {
    const scale = layoutLifelineScale({
      labels: labelsFor([1988, 2019]).map((label) => ({
        ...label,
        align: label.year === 1988 ? "start" : "center",
      })),
      startYear: 1988,
      endYear: 2026,
      minWidth: 660,
    });
    expect(scale.positionOf(2026)).toBeCloseTo((654 / 660) * 100);
    expect(scale.positions[1]).toBeLessThan(100);
  });
});
