import { describe, expect, it } from "vitest";
import { relationLabel, shortLifeSpan } from "./relation-label";
import type { PartialDate } from "@/domain/shared/partial-date";

const year = (y: number): PartialDate => ({
  year: y,
  month: null,
  day: null,
  precision: "year_only",
  isApproximate: false,
});

describe("relationLabel", () => {
  it("uses the relative's own gender", () => {
    expect(relationLabel("parent", "female")).toBe("мать");
    expect(relationLabel("parent", "male")).toBe("отец");
    expect(relationLabel("child", "female")).toBe("дочь");
    expect(relationLabel("sibling", "male")).toBe("брат");
    expect(relationLabel("spouse", "female")).toBe("жена");
  });

  it("falls back to a neutral word for unknown gender", () => {
    expect(relationLabel("parent", "unknown")).toBe("родитель");
    expect(relationLabel("child", "unknown")).toBe("ребёнок");
  });

  it("marks a former partnership in the label itself", () => {
    expect(relationLabel("spouse", "male", false)).toBe("бывший муж");
    expect(relationLabel("spouse", "female", false)).toBe("бывшая жена");
    // isCurrent only means something for partnerships
    expect(relationLabel("parent", "male", false)).toBe("отец");
  });
});

describe("shortLifeSpan", () => {
  it("shows both years for the deceased", () => {
    expect(
      shortLifeSpan({
        isLiving: false,
        birthDate: year(1899),
        deathDate: year(1964),
      }),
    ).toBe("1899–1964");
  });

  it("never shows a dangling dash for the living", () => {
    expect(
      shortLifeSpan({ isLiving: true, birthDate: year(1988), deathDate: null }),
    ).toBe("1988");
    expect(
      shortLifeSpan({ isLiving: true, birthDate: null, deathDate: null }),
    ).toBeNull();
  });

  it("handles partial knowledge", () => {
    expect(
      shortLifeSpan({
        isLiving: false,
        birthDate: null,
        deathDate: year(2011),
      }),
    ).toBe("ум. 2011");
    expect(
      shortLifeSpan({
        isLiving: false,
        birthDate: year(1920),
        deathDate: null,
      }),
    ).toBe("1920–?");
  });
});
