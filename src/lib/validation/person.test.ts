import { describe, expect, it } from "vitest";
import { yearRequiredPartialDateSchema } from "./person";

describe("yearRequiredPartialDateSchema", () => {
  it("accepts a fully absent date (partnership with no known date)", () => {
    const result = yearRequiredPartialDateSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it("accepts year-only", () => {
    const result = yearRequiredPartialDateSchema.safeParse({ year: 2020 });
    expect(result.success).toBe(true);
    expect(result.success && result.data?.year).toBe(2020);
  });

  it("accepts year with month and day", () => {
    const result = yearRequiredPartialDateSchema.safeParse({
      year: 2020,
      month: 7,
      day: 12,
    });
    expect(result.success).toBe(true);
  });

  it("rejects month given without a year", () => {
    const result = yearRequiredPartialDateSchema.safeParse({ month: 6 });
    expect(result.success).toBe(false);
  });

  it("rejects day given without a year", () => {
    const result = yearRequiredPartialDateSchema.safeParse({ day: 15 });
    expect(result.success).toBe(false);
  });
});
