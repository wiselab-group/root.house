import { describe, expect, it } from "vitest";
import { reconcileLivingStatus } from "./reconcile-living-status";
import { UNKNOWN_DATE, type PartialDate } from "@/domain/shared/partial-date";

function dateWithYear(year: number): PartialDate {
  return { ...UNKNOWN_DATE, year };
}

describe("reconcileLivingStatus", () => {
  it("flips isLiving to false when a death year is present", () => {
    const result = reconcileLivingStatus({
      isLiving: true,
      deathDate: dateWithYear(2020),
    });
    expect(result.isLiving).toBe(false);
  });

  it("leaves isLiving true when there is no death date at all", () => {
    const result = reconcileLivingStatus({
      isLiving: true,
      deathDate: undefined,
    });
    expect(result.isLiving).toBe(true);
  });

  it("leaves isLiving true when deathDate is null", () => {
    const result = reconcileLivingStatus({ isLiving: true, deathDate: null });
    expect(result.isLiving).toBe(true);
  });

  it("leaves isLiving true when deathDate has no year (unknown precision)", () => {
    const result = reconcileLivingStatus({
      isLiving: true,
      deathDate: UNKNOWN_DATE,
    });
    expect(result.isLiving).toBe(true);
  });

  it("does not touch isLiving when it's already false", () => {
    const result = reconcileLivingStatus({
      isLiving: false,
      deathDate: dateWithYear(2020),
    });
    expect(result.isLiving).toBe(false);
  });

  it("does not flip isLiving back to true when deathDate is cleared", () => {
    // Reverse direction is intentionally NOT handled — see the doc comment.
    const result = reconcileLivingStatus({ isLiving: false, deathDate: null });
    expect(result.isLiving).toBe(false);
  });

  it("preserves every other field on the input unchanged", () => {
    const input = {
      isLiving: true,
      deathDate: dateWithYear(1999),
      firstName: "Алекс",
    };
    const result = reconcileLivingStatus(input);
    expect(result.firstName).toBe("Алекс");
  });
});
