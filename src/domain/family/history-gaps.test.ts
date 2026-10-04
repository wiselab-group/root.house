import { describe, expect, it } from "vitest";
import { findHistoryGaps, gapKey, type GapPerson } from "./history-gaps";

const complete = {
  isPlaceholder: false,
  birthDate: { year: 1950, precision: "year" },
  birthPlaceId: "place",
  photoMediaId: "photo",
} as unknown as Omit<GapPerson, "id">;

function person(id: string, overrides: Partial<GapPerson> = {}): GapPerson {
  return { id, ...complete, ...overrides };
}

describe("findHistoryGaps", () => {
  it("returns nothing for people with everything known", () => {
    const people = [person("a"), person("b")];
    expect(findHistoryGaps(people, [], new Set(), new Set(), 0)).toEqual([]);
  });

  it("asks for parents only where a line starts", () => {
    const people = [person("a"), person("b"), person("c")];
    const edges = [{ parentId: "a", childId: "b" }];
    // b has a parent, c has no children — only a starts a line.
    expect(findHistoryGaps(people, edges, new Set(), new Set(), 0)).toEqual([
      { kind: "parents", personId: "a" },
    ]);
  });

  it("counts a tagged photo as a photo", () => {
    const people = [person("a", { photoMediaId: null })];
    expect(findHistoryGaps(people, [], new Set(["a"]), new Set(), 0)).toEqual(
      [],
    );
    expect(findHistoryGaps(people, [], new Set(), new Set(), 0)).toEqual([
      { kind: "photo", personId: "a" },
    ]);
  });

  it("skips gaps answered «Мы не знаем»", () => {
    const people = [person("a", { birthDate: null, birthPlaceId: null })];
    const dismissed = new Set([gapKey("a", "birthDate")]);
    expect(findHistoryGaps(people, [], new Set(), dismissed, 0)).toEqual([
      { kind: "birthPlace", personId: "a" },
    ]);
  });

  it("skips placeholders", () => {
    const people = [
      person("a", { isPlaceholder: true, birthDate: null, photoMediaId: null }),
    ];
    expect(findHistoryGaps(people, [], new Set(), new Set(), 0)).toEqual([]);
  });

  it("puts each person's first gap ahead of anyone's second", () => {
    const people = [
      person("a", { birthDate: null, birthPlaceId: null }),
      person("b", { birthPlaceId: null }),
    ];
    expect(findHistoryGaps(people, [], new Set(), new Set(), 0)).toEqual([
      { kind: "birthDate", personId: "a" },
      { kind: "birthPlace", personId: "b" },
      { kind: "birthPlace", personId: "a" },
    ]);
  });

  it("rotates who comes first by day", () => {
    const people = [
      person("a", { birthDate: null }),
      person("b", { birthDate: null }),
    ];
    const first = (day: number) =>
      findHistoryGaps(people, [], new Set(), new Set(), day)[0].personId;
    expect(first(0)).toBe("a");
    expect(first(1)).toBe("b");
    expect(first(2)).toBe("a");
  });
});
