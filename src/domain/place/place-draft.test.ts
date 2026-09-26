import { describe, expect, it } from "vitest";
import { findMatchingPlace, type PlaceDraft } from "./place-draft";
import type { PlaceRecord } from "./place.repository";

function place(
  id: string,
  name: string,
  point: [number, number] | null = null,
): PlaceRecord {
  return {
    id,
    familyId: "f",
    name,
    description: null,
    country: null,
    region: null,
    latitude: point?.[0] ?? null,
    longitude: point?.[1] ?? null,
  };
}

function draft(
  name: string,
  point: [number, number] | null = null,
): PlaceDraft {
  return {
    name,
    region: null,
    country: null,
    latitude: point?.[0] ?? null,
    longitude: point?.[1] ?? null,
  };
}

const TALLINN: [number, number] = [59.437, 24.7536];

describe("findMatchingPlace", () => {
  it("reuses a saved place with the same name nearby", () => {
    const saved = place("t", "Таллинн", [59.44, 24.75]);
    expect(findMatchingPlace([saved], draft(" таллинн ", TALLINN))).toBe(saved);
  });

  it("keeps namesakes far apart as different places", () => {
    // Кировск, Ленинградская обл. vs Кировск, Мурманская обл.
    const saved = place("k", "Кировск", [59.875, 30.98]);
    expect(
      findMatchingPlace([saved], draft("Кировск", [67.61, 33.67])),
    ).toBeNull();
  });

  it("matches a saved place without a pin by name alone", () => {
    const saved = place("t", "Таллинн");
    expect(findMatchingPlace([saved], draft("Таллинн", TALLINN))).toBe(saved);
  });

  it("matches a typed-in name without coordinates by name", () => {
    const saved = place("t", "Таллинн", TALLINN);
    expect(findMatchingPlace([saved], draft("Таллинн"))).toBe(saved);
  });

  it("returns null when no saved place has that name", () => {
    expect(
      findMatchingPlace([place("m", "Минск")], draft("Таллинн", TALLINN)),
    ).toBeNull();
  });
});
