import { describe, expect, it } from "vitest";
import type { PartialDate } from "@/domain/shared/partial-date";
import { lifeAge } from "./life-age";

const date = (
  year: number,
  month: number | null = null,
  day: number | null = null,
  isApproximate = false,
): PartialDate => ({
  year,
  month,
  day,
  precision: day != null ? "exact" : "year_only",
  isApproximate,
});

const TODAY = new Date(Date.UTC(2026, 8, 27)); // 27 Sep 2026

describe("lifeAge", () => {
  it("counts a living person's age up to today", () => {
    expect(
      lifeAge(
        { isLiving: true, birthDate: date(1988, 3, 12), deathDate: null },
        TODAY,
      ),
    ).toEqual({ years: 38, months: null, isApproximate: false });
  });

  it("hasn't reached this year's birthday yet", () => {
    expect(
      lifeAge(
        { isLiving: true, birthDate: date(1988, 11, 2), deathDate: null },
        TODAY,
      )?.years,
    ).toBe(37);
  });

  it("uses the age at death for someone deceased", () => {
    expect(
      lifeAge(
        { isLiving: false, birthDate: date(1936), deathDate: date(2008) },
        TODAY,
      ),
    ).toEqual({ years: 72, months: null, isApproximate: false });
  });

  it("marks an approximate date", () => {
    expect(
      lifeAge(
        {
          isLiving: false,
          birthDate: date(1936),
          deathDate: date(2008, null, null, true),
        },
        TODAY,
      )?.isApproximate,
    ).toBe(true);
  });

  it("is null without a birth year, or a death year once deceased", () => {
    expect(
      lifeAge({ isLiving: true, birthDate: null, deathDate: null }, TODAY),
    ).toBeNull();
    expect(
      lifeAge(
        { isLiving: false, birthDate: date(1936), deathDate: null },
        TODAY,
      ),
    ).toBeNull();
  });

  it("drops an implausible age for someone still marked living", () => {
    expect(
      lifeAge(
        { isLiving: true, birthDate: date(1900), deathDate: null },
        TODAY,
      ),
    ).toBeNull();
  });

  it("counts a baby's age in months", () => {
    expect(
      lifeAge(
        {
          isLiving: false,
          birthDate: date(1931, 2, 10),
          deathDate: date(1931, 10, 3),
        },
        TODAY,
      ),
    ).toEqual({ years: 0, months: 7, isApproximate: false });
  });

  it("keeps months alongside the first year, then drops them", () => {
    expect(
      lifeAge(
        { isLiving: true, birthDate: date(2025, 5, 20), deathDate: null },
        TODAY,
      ),
    ).toEqual({ years: 1, months: 4, isApproximate: false });
    expect(
      lifeAge(
        { isLiving: true, birthDate: date(2025, 9, 1), deathDate: null },
        TODAY,
      ),
    ).toEqual({ years: 1, months: null, isApproximate: false });
    expect(
      lifeAge(
        { isLiving: true, birthDate: date(2024, 5, 20), deathDate: null },
        TODAY,
      )?.months,
    ).toBeNull();
  });

  it("has no age under a year when a month is missing or it's under a month", () => {
    expect(
      lifeAge(
        { isLiving: false, birthDate: date(1931), deathDate: date(1931) },
        TODAY,
      ),
    ).toBeNull();
    expect(
      lifeAge(
        { isLiving: true, birthDate: date(2026, 9, 10), deathDate: null },
        TODAY,
      ),
    ).toBeNull();
  });
});
