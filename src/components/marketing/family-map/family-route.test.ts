import { describe, expect, it } from "vitest";
import {
  YEAR_FROM,
  YEAR_TO,
  progressForYear,
  stopAt,
  yearAtProgress,
} from "./family-route.data";

describe("yearAtProgress / progressForYear", () => {
  it("holds the first year at the start and the last at the end", () => {
    expect(yearAtProgress(0)).toBe(YEAR_FROM);
    expect(yearAtProgress(0.03)).toBe(YEAR_FROM);
    expect(yearAtProgress(0.95)).toBe(YEAR_TO);
    expect(yearAtProgress(1)).toBe(YEAR_TO);
  });

  it("only moves forward as the page scrolls down", () => {
    expect(yearAtProgress(0.5)).toBeGreaterThan(yearAtProgress(0.3));
  });

  it("scrolling to a year's progress lands on that year", () => {
    for (const year of [YEAR_FROM, 1956, 1989, YEAR_TO]) {
      expect(yearAtProgress(progressForYear(year))).toBeCloseTo(year);
    }
  });
});

describe("stopAt", () => {
  it("is empty before the first stop and the latest one after", () => {
    expect(stopAt(1927)).toBeUndefined();
    expect(stopAt(1960)?.id).toBe("s1956");
    expect(stopAt(YEAR_TO)?.id).toBe("s2016");
  });
});
