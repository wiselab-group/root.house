import { describe, expect, it } from "vitest";
import {
  comparePartialDates,
  formatPartialDate,
  fromColumns,
  toColumns,
  toSortableValue,
  type PartialDate,
} from "./partial-date";

describe("formatPartialDate", () => {
  it("formats an unknown date", () => {
    expect(formatPartialDate(null)).toBe("неизвестно");
    expect(formatPartialDate({ year: null, month: null, day: null, precision: "unknown", isApproximate: false })).toBe(
      "неизвестно",
    );
  });

  it("formats a decade", () => {
    const date: PartialDate = { year: 1923, month: null, day: null, precision: "decade", isApproximate: false };
    expect(formatPartialDate(date)).toBe("1920-е гг.");
  });

  it("formats a year-only date", () => {
    const date: PartialDate = { year: 1924, month: null, day: null, precision: "year_only", isApproximate: false };
    expect(formatPartialDate(date)).toBe("1924 г.");
  });

  it("formats an exact date", () => {
    const date: PartialDate = { year: 1924, month: 5, day: 12, precision: "exact", isApproximate: false };
    expect(formatPartialDate(date)).toBe("12 мая 1924 г.");
  });

  it("prefixes approximate dates", () => {
    const date: PartialDate = { year: 1924, month: null, day: null, precision: "year_only", isApproximate: true };
    expect(formatPartialDate(date)).toBe("около 1924 г.");
  });
});

describe("comparePartialDates / toSortableValue", () => {
  it("sorts known dates chronologically", () => {
    const earlier: PartialDate = { year: 1900, month: 1, day: 1, precision: "exact", isApproximate: false };
    const later: PartialDate = { year: 1950, month: 1, day: 1, precision: "exact", isApproximate: false };
    expect(comparePartialDates(earlier, later)).toBeLessThan(0);
  });

  it("sorts unknown dates last", () => {
    const known: PartialDate = { year: 1950, month: 1, day: 1, precision: "exact", isApproximate: false };
    expect(toSortableValue(null)).toBe(Number.POSITIVE_INFINITY);
    expect(comparePartialDates(known, null)).toBeLessThan(0);
  });
});

describe("column round-trip", () => {
  it("preserves a fully-specified date through columns and back", () => {
    const date: PartialDate = { year: 1924, month: 5, day: 12, precision: "exact", isApproximate: false };
    const columns = toColumns(date);
    expect(fromColumns(columns)).toEqual(date);
  });

  it("returns null for an all-null column group", () => {
    expect(fromColumns({ year: null, month: null, day: null, precision: null, approximate: null })).toBeNull();
  });
});
