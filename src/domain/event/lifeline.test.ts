import { describe, expect, it } from "vitest";
import { ageAt, buildLifeline } from "./lifeline";
import type { EventRecord } from "./event.repository";

const event = (id: string, year: number | null): EventRecord => ({
  id,
  familyId: "f",
  type: "other",
  title: id,
  description: null,
  date:
    year == null
      ? null
      : {
          year,
          month: null,
          day: null,
          precision: "year_only",
          isApproximate: false,
        },
  endDate: null,
  placeId: null,
  privacyLevel: "family",
  createdBy: null,
});

describe("buildLifeline", () => {
  it("needs at least two dated years", () => {
    const opts = { isLiving: true, currentYear: 2026 };
    expect(buildLifeline([event("birth", 1988)], opts)).toBeNull();
    expect(
      buildLifeline([event("birth", 1988), event("undated", null)], opts),
    ).toBeNull();
  });

  it("runs a living person's axis up to the current year", () => {
    const lifeline = buildLifeline(
      [event("birth", 1988), event("wedding", 2019)],
      { isLiving: true, currentYear: 2026 },
    )!;
    expect(lifeline.startYear).toBe(1988);
    expect(lifeline.endYear).toBe(2026);
    expect(lifeline.points.map((p) => p.side)).toEqual(["up", "down"]);
    expect(lifeline.points[0].position).toBeCloseTo(0.7);
    expect(lifeline.points[1].position).toBeCloseTo((31 / 38) * 100);
    expect(lifeline.decades.map((d) => d.year)).toEqual([
      1990, 2000, 2010, 2020,
    ]);
  });

  it("ends a deceased person's axis at the last event", () => {
    const lifeline = buildLifeline(
      [event("birth", 1869), event("death", 1938)],
      { isLiving: false, currentYear: 2026 },
    )!;
    expect(lifeline.endYear).toBe(1938);
    expect(lifeline.points[1].position).toBeCloseTo(99.3);
  });

  it("merges events of the same year into one dot", () => {
    const lifeline = buildLifeline(
      [event("a", 1896), event("b", 1896), event("c", 1910)],
      { isLiving: false, currentYear: 2026 },
    )!;
    expect(lifeline.points).toHaveLength(2);
    expect(lifeline.points[0].events.map((e) => e.id)).toEqual(["a", "b"]);
    expect(lifeline.points[0].id).toBe("a");
  });
});

describe("ageAt", () => {
  it("speaks about the person by gender", () => {
    expect(ageAt(2019, 1988, "male")).toBe("ему 31");
    expect(ageAt(2019, 1988, "female")).toBe("ей 31");
    expect(ageAt(2009, 1988, "unknown")).toBe("21 год");
    expect(ageAt(2000, 1988, "unknown")).toBe("12 лет");
    expect(ageAt(1990, 1988, "unknown")).toBe("2 года");
  });

  it("has no age at or before birth", () => {
    expect(ageAt(1988, 1988, "male")).toBeNull();
    expect(ageAt(2000, null, "male")).toBeNull();
  });
});
