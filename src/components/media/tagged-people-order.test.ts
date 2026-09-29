import { describe, expect, it } from "vitest";
import { sortLeftToRight } from "./tagged-people-order";

function person(id: string, x: number | null, y: number | null = 50) {
  return {
    id,
    slug: id,
    firstName: id,
    lastName: null,
    nickname: null,
    isPlaceholder: false,
    photoMediaId: null,
    xPercent: x,
    yPercent: y,
    radiusPercent: null,
  };
}

const ids = (people: { id: string }[]) => people.map((p) => p.id);

describe("sortLeftToRight", () => {
  it("orders people by where they stand on the photo", () => {
    expect(
      ids(sortLeftToRight([person("c", 80), person("a", 10), person("b", 45)])),
    ).toEqual(["a", "b", "c"]);
  });

  it("puts the higher one first when two share an x", () => {
    expect(
      ids(sortLeftToRight([person("front", 30, 70), person("back", 30, 20)])),
    ).toEqual(["back", "front"]);
  });

  it("keeps people without a point last, in their original order", () => {
    expect(
      ids(
        sortLeftToRight([
          person("n1", null),
          person("b", 60),
          person("n2", null),
          person("a", 5),
        ]),
      ),
    ).toEqual(["a", "b", "n1", "n2"]);
  });
});
