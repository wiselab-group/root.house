import { describe, expect, it } from "vitest";
import type { PartialDate } from "@/domain/shared/partial-date";
import { anniversariesOn } from "./anniversaries";

const TODAY = { year: 2026, month: 10, day: 1 };

function date(
  year: number | null,
  month: number | null,
  day: number | null,
  isApproximate = false,
): PartialDate {
  return { year, month, day, precision: "exact", isApproximate };
}

function person(
  id: string,
  birthDate: PartialDate | null,
  deathDate: PartialDate | null = null,
) {
  return { id, isLiving: deathDate === null, birthDate, deathDate };
}

describe("anniversariesOn", () => {
  it("finds a living person's birthday with their age", () => {
    expect(
      anniversariesOn(TODAY, [person("a", date(1988, 10, 1))], []),
    ).toEqual([{ kind: "birthday", personIds: ["a"], years: 38 }]);
  });

  it("gives a birthday without a known year no age", () => {
    expect(
      anniversariesOn(TODAY, [person("a", date(null, 10, 1))], []),
    ).toEqual([{ kind: "birthday", personIds: ["a"], years: null }]);
  });

  it("marks a deceased person's birth and death, but a birth only with a year", () => {
    const people = [
      person("ivan", date(1896, 10, 1), date(2006, 10, 1)),
      person("olga", date(null, 10, 1), date(1990, 3, 3)),
    ];
    expect(anniversariesOn(TODAY, people, [])).toEqual([
      { kind: "birth", personIds: ["ivan"], years: 130 },
      { kind: "memory", personIds: ["ivan"], years: 20 },
    ]);
  });

  it("ignores approximate dates, other days and dates without a day", () => {
    const people = [
      person("a", date(1950, 10, 1, true)),
      person("b", date(1950, 10, 2)),
      person("c", date(1950, 10, null)),
    ];
    expect(anniversariesOn(TODAY, people, [])).toEqual([]);
  });

  it("counts a wedding only for a married or widowed couple both visible", () => {
    const people = [person("v", null), person("g", null), person("x", null)];
    const wedding = date(1952, 10, 1);
    const partnerships = [
      {
        person1Id: "v",
        person2Id: "g",
        status: "married" as const,
        startDate: wedding,
      },
      {
        person1Id: "v",
        person2Id: "x",
        status: "divorced" as const,
        startDate: wedding,
      },
      {
        person1Id: "g",
        person2Id: "hidden",
        status: "married" as const,
        startDate: wedding,
      },
    ];
    expect(anniversariesOn(TODAY, people, partnerships)).toEqual([
      { kind: "wedding", personIds: ["v", "g"], years: 74 },
    ]);
  });

  it("orders birthdays first, then weddings, births and memory days", () => {
    const people = [
      person("dead", date(1900, 10, 1), date(1980, 10, 1)),
      person("alive", date(1990, 10, 1)),
      person("p1", null),
      person("p2", null),
    ];
    const partnerships = [
      {
        person1Id: "p1",
        person2Id: "p2",
        status: "married" as const,
        startDate: date(2000, 10, 1),
      },
    ];
    expect(
      anniversariesOn(TODAY, people, partnerships).map((a) => a.kind),
    ).toEqual(["birthday", "wedding", "birth", "memory"]);
  });
});
