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
    expect(relationLabel("parent", "female", true, "ru")).toBe("мать");
    expect(relationLabel("parent", "male", true, "ru")).toBe("отец");
    expect(relationLabel("child", "female", true, "ru")).toBe("дочь");
    expect(relationLabel("sibling", "male", true, "ru")).toBe("брат");
    expect(relationLabel("spouse", "female", true, "ru")).toBe("жена");
  });

  it("falls back to a neutral word for unknown gender", () => {
    expect(relationLabel("parent", "unknown", true, "ru")).toBe("родитель");
    expect(relationLabel("child", "unknown", true, "ru")).toBe("ребёнок");
  });

  it("marks a former partnership in the label itself", () => {
    expect(relationLabel("spouse", "male", false, "ru")).toBe("бывший муж");
    expect(relationLabel("spouse", "female", false, "ru")).toBe("бывшая жена");
    // isCurrent only means something for partnerships
    expect(relationLabel("parent", "male", false, "ru")).toBe("отец");
  });
});

describe("relationLabel (en)", () => {
  it("uses English kin nouns", () => {
    expect(relationLabel("parent", "female", true, "en")).toBe("mother");
    expect(relationLabel("sibling", "unknown", true, "en")).toBe("sibling");
    expect(relationLabel("spouse", "male", false, "en")).toBe("ex-husband");
  });
});

describe("shortLifeSpan", () => {
  it("shows both years for the deceased", () => {
    expect(
      shortLifeSpan(
        {
          isLiving: false,
          birthDate: year(1899),
          deathDate: year(1964),
        },
        "ru",
      ),
    ).toBe("1899–1964");
  });

  it("never shows a dangling dash for the living", () => {
    expect(
      shortLifeSpan(
        { isLiving: true, birthDate: year(1988), deathDate: null },
        "ru",
      ),
    ).toBe("1988");
    expect(
      shortLifeSpan({ isLiving: true, birthDate: null, deathDate: null }, "ru"),
    ).toBeNull();
  });

  it("handles partial knowledge", () => {
    expect(
      shortLifeSpan(
        {
          isLiving: false,
          birthDate: null,
          deathDate: year(2011),
        },
        "ru",
      ),
    ).toBe("ум. 2011");
    expect(
      shortLifeSpan(
        {
          isLiving: false,
          birthDate: year(1920),
          deathDate: null,
        },
        "ru",
      ),
    ).toBe("1920–?");
  });

  it("marks a lone death year per locale", () => {
    const person = { isLiving: false, birthDate: null, deathDate: year(2011) };
    expect(shortLifeSpan(person, "en")).toBe("d. 2011");
  });
});
