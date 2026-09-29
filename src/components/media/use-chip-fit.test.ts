import { describe, expect, it } from "vitest";
import { fitChipCount } from "./use-chip-fit";

describe("fitChipCount", () => {
  it("shows every chip when the whole row fits", () => {
    expect(fitChipCount([100, 100, 100], 40, 316, 8)).toBe(3);
  });

  it("keeps room for the «+N» chip when not all fit", () => {
    // 100 + 8 + 100 + 8 + 40 = 256 fits; a third chip would not.
    expect(fitChipCount([100, 100, 100], 40, 300, 8)).toBe(2);
  });

  it("falls back to «+N» alone when not even one chip fits beside it", () => {
    expect(fitChipCount([200, 100], 40, 220, 8)).toBe(0);
  });

  it("handles an empty row", () => {
    expect(fitChipCount([], 40, 300, 8)).toBe(0);
  });
});
