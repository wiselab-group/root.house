import { describe, expect, it } from "vitest";
import { dayPeriod, isTimeZone } from "./day-period";

describe("dayPeriod", () => {
  it("reads the hour in the given zone, not UTC", () => {
    // 15:30 UTC is 18:30 in Tallinn (UTC+3 in summer) — evening there.
    const now = new Date("2026-07-01T15:30:00Z");
    expect(dayPeriod(now, "UTC")).toBe("day");
    expect(dayPeriod(now, "Europe/Tallinn")).toBe("evening");
  });

  it("splits the day at 5, 12, 17 and 23", () => {
    const at = (hour: number) =>
      dayPeriod(new Date(Date.UTC(2026, 0, 1, hour, 0)), "UTC");
    expect([4, 5, 11, 12, 16, 17, 22, 23, 0].map(at)).toEqual([
      "night",
      "morning",
      "morning",
      "day",
      "day",
      "evening",
      "evening",
      "night",
      "night",
    ]);
  });
});

describe("isTimeZone", () => {
  it("accepts IANA zones and rejects anything else", () => {
    expect(isTimeZone("Europe/Tallinn")).toBe(true);
    expect(isTimeZone("Not/AZone")).toBe(false);
    expect(isTimeZone("")).toBe(false);
    expect(isTimeZone(undefined)).toBe(false);
  });
});
