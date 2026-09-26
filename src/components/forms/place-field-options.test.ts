import { describe, expect, it } from "vitest";
import {
  buildPlaceOptionGroups,
  selectionFromOption,
} from "./place-field-options";
import type { PlaceRecord } from "@/domain/place/place.service";
import type { GeocodeResult } from "@/lib/maptiler-geocode";

function place(id: string, name: string): PlaceRecord {
  return {
    id,
    familyId: "f",
    name,
    description: null,
    country: null,
    region: null,
    latitude: null,
    longitude: null,
  };
}

const tallinnResult: GeocodeResult = {
  id: "place.1",
  label: "Таллинн, Уезд Харьюмаа, Эстония",
  name: "Таллинн",
  region: "Уезд Харьюмаа",
  country: "Эстония",
  latitude: 59.437,
  longitude: 24.7536,
};

const places = [place("m", "Минск"), place("g", "Гродно")];

describe("buildPlaceOptionGroups", () => {
  it("lists every saved place when nothing is typed", () => {
    const groups = buildPlaceOptionGroups(places, "", []);
    expect(groups.map((group) => group.value)).toEqual(["saved"]);
    expect(groups[0].items).toHaveLength(2);
  });

  it("filters saved places and adds map results and «add as typed»", () => {
    const groups = buildPlaceOptionGroups(places, "тал", [tallinnResult]);
    expect(groups.map((group) => group.value)).toEqual(["map", "typed"]);
    expect(groups[1].items[0]).toMatchObject({ kind: "typed", name: "тал" });
  });

  it("skips «add as typed» when a saved place has exactly that name", () => {
    const groups = buildPlaceOptionGroups(places, " минск", []);
    expect(groups.map((group) => group.value)).toEqual(["saved"]);
  });

  it("hides a map result the family already has", () => {
    const saved = {
      ...place("t", "Таллинн"),
      latitude: 59.44,
      longitude: 24.75,
    };
    const groups = buildPlaceOptionGroups([saved], "Таллинн", [tallinnResult]);
    expect(groups.map((group) => group.value)).toEqual(["saved"]);
  });
});

describe("selectionFromOption", () => {
  it("turns a map result into a draft with its short name and pin", () => {
    expect(
      selectionFromOption({ key: "map:1", kind: "map", result: tallinnResult }),
    ).toEqual({
      kind: "draft",
      draft: {
        name: "Таллинн",
        region: "Уезд Харьюмаа",
        country: "Эстония",
        latitude: 59.437,
        longitude: 24.7536,
      },
    });
  });
});
