import { describe, expect, it } from "vitest";
import type { ChronoEvent, ChronoPerson } from "./geo-chronology";
import {
  computeGenerations,
  findBranches,
  type BranchPerson,
} from "./family-branches";
import { buildGeoModel } from "./geo-model";
import {
  ROUTE_DRAW_YEARS,
  buildFeed,
  currentPlaces,
  pathOf,
  snapshotAt,
  storyCaptionAt,
  storyHoldYears,
  timelineRange,
} from "./map-snapshot";
import { placeStory } from "./place-story";

type P = ChronoPerson & BranchPerson;

function person(id: string, over: Partial<P> = {}): P {
  return {
    id,
    isLiving: false,
    birthYear: null,
    deathYear: null,
    birthPlaceId: null,
    deathPlaceId: null,
    residencePlaceId: null,
    lastName: null,
    maidenName: null,
    ...over,
  };
}

// The mocks' family: Купчик from Warsaw, Ушкар from Minsk, meeting in Kyiv.
const persons: P[] = [
  person("ivan", {
    birthYear: 1898,
    deathYear: 1980,
    birthPlaceId: "waw",
    deathPlaceId: "lviv",
    lastName: "Купчик",
  }),
  person("anna", { lastName: "Купчик", maidenName: "Иванова" }),
  person("galina", {
    birthYear: 1945,
    deathYear: 2026,
    birthPlaceId: "lviv",
    deathPlaceId: "kyiv",
    lastName: "Купчик",
  }),
  person("petr", { birthYear: 1930, birthPlaceId: "minsk", lastName: "Ушкар" }),
  person("sergey", {
    isLiving: true,
    birthYear: 1960,
    birthPlaceId: "minsk",
    lastName: "Ушкар",
  }),
  person("lyudmila", {
    isLiving: true,
    birthYear: 1962,
    birthPlaceId: "lviv",
    lastName: "Ушкар",
    maidenName: "Купчик",
  }),
  person("olga", {
    isLiving: true,
    birthYear: 1968,
    birthPlaceId: "kyiv",
    residencePlaceId: "odesa",
    lastName: "Купчик",
  }),
  person("alex", {
    isLiving: true,
    birthYear: 1988,
    birthPlaceId: "kyiv",
    lastName: "Ушкар",
  }),
  person("vera", { isLiving: true, lastName: "Ушкар" }),
];
const events: ChronoEvent[] = [
  {
    id: "e1",
    type: "migration",
    year: 1939,
    placeId: "lviv",
    participantIds: ["ivan"],
  },
  {
    id: "e2",
    type: "migration",
    year: 1967,
    placeId: "kyiv",
    participantIds: ["galina", "lyudmila"],
  },
  {
    id: "e3",
    type: "migration",
    year: 1985,
    placeId: "kyiv",
    participantIds: ["sergey"],
  },
  {
    id: "e4",
    type: "marriage",
    year: 1985,
    placeId: "kyiv",
    participantIds: ["sergey", "lyudmila"],
  },
  { id: "e5", type: "other", year: 2018, placeId: "kyiv", participantIds: [] },
  {
    id: "e6",
    type: "other",
    year: null,
    placeId: "lviv",
    participantIds: ["ivan"],
  },
  {
    id: "e7",
    type: "other",
    year: 1950,
    placeId: "nowhere",
    participantIds: ["ivan"],
  },
];
const places = [
  { id: "waw", country: "Польша" },
  { id: "lviv", country: "Украина" },
  { id: "minsk", country: "Беларусь" },
  { id: "kyiv", country: "Украина" },
  { id: "odesa", country: "Украина" },
];
const parentChild = [
  { parentId: "ivan", childId: "galina" },
  { parentId: "anna", childId: "galina" },
  { parentId: "petr", childId: "sergey" },
  { parentId: "galina", childId: "lyudmila" },
  { parentId: "galina", childId: "olga" },
  { parentId: "sergey", childId: "alex" },
  { parentId: "lyudmila", childId: "alex" },
];
const partners = [
  { person1Id: "ivan", person2Id: "anna" },
  { person1Id: "sergey", person2Id: "lyudmila" },
  { person1Id: "alex", person2Id: "vera" },
];
const model = buildGeoModel({
  persons,
  events,
  places,
  parentChild,
  partners,
  currentYear: 2026,
});

describe("generations", () => {
  it("ranks by the deepest parent and puts an in-law beside their partner", () => {
    expect(model.generations).toMatchObject({
      ivan: 0,
      anna: 0,
      petr: 0,
      galina: 1,
      sergey: 1,
      lyudmila: 2,
      olga: 2,
      alex: 3,
      vera: 3,
    });
  });
});

describe("stays and routes", () => {
  it("drops stops at places that cannot be drawn", () => {
    expect(model.stops.some((s) => s.placeId === "nowhere")).toBe(false);
  });

  it("moves a person from their previous stop, and ends the dead at death", () => {
    const ivan = model.stays.filter((s) => s.personId === "ivan");
    expect(ivan.map((s) => [s.placeId, s.from, s.to])).toEqual([
      ["waw", 1898, 1939],
      ["lviv", 1939, 1980],
    ]);
  });

  it("fades an undated death after an assumed lifespan", () => {
    const petr = model.stays.find((s) => s.personId === "petr");
    expect(petr?.to).toBe(2005);
  });

  it("merges a shared move into one route, and leaves a residence move undated", () => {
    const lk = model.routes.find((r) => r.id === "lviv>kyiv");
    expect(lk?.year).toBe(1967);
    expect(lk?.personIds.sort()).toEqual(["galina", "lyudmila"]);
    expect(model.routes.find((r) => r.id === "kyiv>odesa")?.year).toBeNull();
  });
});

describe("snapshotAt", () => {
  it("shows who is where in a given year", () => {
    const at = snapshotAt(model, 1967);
    expect(at.places.get("waw")?.state).toBe("past");
    expect(at.places.get("lviv")?.personIds).toEqual(["ivan"]);
    expect(at.places.get("kyiv")?.personIds.sort()).toEqual([
      "galina",
      "lyudmila",
    ]);
    expect(at.places.has("odesa")).toBe(false);
    expect(at.stats).toEqual({ generations: 3, places: 4, countries: 3 });
  });

  it("draws a move in from the year it happened while playing", () => {
    const at = snapshotAt(model, 1967, true);
    const fresh = at.routes.find((r) => r.route.id === "lviv>kyiv");
    expect(fresh).toMatchObject({ progress: 0, recent: true });
    expect(
      snapshotAt(model, 1968, true).routes.find(
        (r) => r.route.id === "lviv>kyiv",
      )?.progress,
    ).toBe(0.2);
    expect(at.routes.find((r) => r.route.id === "waw>lviv")).toMatchObject({
      progress: 1,
      recent: false,
    });
    expect(at.routes.some((r) => r.route.id === "minsk>kyiv")).toBe(false);
  });

  it("shows a hand-picked year's moves whole", () => {
    const fresh = snapshotAt(model, 1967).routes.find(
      (r) => r.route.id === "lviv>kyiv",
    );
    expect(fresh).toMatchObject({ progress: 1, recent: true });
  });

  it("shows the whole family for «Всё время», the living as present", () => {
    const all = snapshotAt(model, "all");
    expect(all.stats).toEqual({ generations: 4, places: 5, countries: 3 });
    expect(currentPlaces(model)).toEqual([
      { placeId: "kyiv", personIds: ["sergey", "lyudmila", "alex"] },
      { placeId: "odesa", personIds: ["olga"] },
    ]);
  });
});

describe("timeline and feed", () => {
  it("spans the first dated stop to today and counts undated stops", () => {
    const range = timelineRange(model);
    expect(range).toMatchObject({ from: 1898, to: 2026, undated: 1 });
    expect(range?.density[1985]).toBe(3);
  });

  it("tells one event once, with where the movers came from", () => {
    const feed = buildFeed(model);
    const move = feed.find((f) => f.eventId === "e2");
    expect(move).toMatchObject({
      year: 1967,
      placeId: "kyiv",
      fromPlaceId: "lviv",
    });
    expect(move?.personIds).toEqual(["galina", "lyudmila"]);
    expect(feed.find((f) => f.eventId === "e3")?.fromPlaceId).toBe("minsk");
    expect(feed.map((f) => f.year)).toEqual(
      [...feed.map((f) => f.year)].sort((a, b) => a - b),
    );
  });

  it("captions a fresh beat, then where the family is, and ends on today", () => {
    const feed = buildFeed(model);
    const range = timelineRange(model) as NonNullable<
      ReturnType<typeof timelineRange>
    >;
    const at = (year: number) => storyCaptionAt(model, feed, range, year);

    expect(at(1931)).toMatchObject({
      kind: "beat",
      item: { kind: "birth", personIds: ["petr"] },
    });
    // 1988 is long past by 1999: no beat lingers, the family's places do.
    expect(at(1999)).toEqual({
      kind: "settled",
      placeIds: ["kyiv", "minsk"],
    });
    // Galina died in 2026, the last beat — the story still ends on today.
    expect(at(2026)).toEqual({
      kind: "today",
      placeIds: currentPlaces(model).map((p) => p.placeId),
    });
  });

  it("holds on each beat before today, a move once it has drawn in", () => {
    const holds = storyHoldYears(buildFeed(model), {
      from: 1898,
      to: 2026,
      density: {},
      undated: 0,
    });
    expect(holds).toContain(1898);
    expect(holds).toContain(1967 + ROUTE_DRAW_YEARS);
    expect(holds).not.toContain(2026);
    // A move just before today holds before the story's end, not on it.
    const late = storyHoldYears(
      [
        {
          key: "m",
          year: 2024,
          kind: "move",
          placeId: "x",
          fromPlaceId: null,
          personIds: [],
        },
      ],
      { from: 2000, to: 2026, density: {}, undated: 0 },
    );
    expect(late).toEqual([2025.5]);
    expect(holds).toEqual([...holds].sort((a, b) => a - b));
  });
});

describe("branches", () => {
  const branches = findBranches(
    persons,
    parentChild,
    partners,
    new Map(Object.entries(model.generations)),
  );

  it("finds one branch per founding couple, named by the founders' surname", () => {
    expect(
      branches.map((b) => [
        b.rootId,
        b.surname,
        b.lineIds.length,
        b.memberIds.length,
        b.generations,
        b.joinsRootId,
      ]),
    ).toEqual([
      ["ivan", "Купчик", 5, 6, 3, "petr"],
      ["petr", "Ушкар", 3, 3, 4, null],
    ]);
  });

  it("tells converging lines apart instead of repeating the biggest one", () => {
    // Two in-married lines (Колесникович, Струневский) feed the Козловский
    // line: all three reach the same grandchildren, yet each keeps its name.
    const people = [
      person("petr", { lastName: "Козловский" }),
      person("vasily", { lastName: "Козловский" }),
      person("filip", { lastName: "Струневский" }),
      person("agrafena", {
        lastName: "Колесникович",
        maidenName: "Струневская",
      }),
      person("iosif", { lastName: "Колесникович" }),
      person("grigory", { lastName: "Колесникович" }),
      person("nadezhda", {
        lastName: "Козловская",
        maidenName: "Колесникович",
      }),
      person("galina", { lastName: "Купчик", maidenName: "Козловская" }),
      person("nina", { lastName: "Козловская" }),
      person("yustin", { lastName: "Купчик" }),
      person("vladimir", { lastName: "Купчик" }),
      person("viktor", { lastName: "Купчик" }),
      person("sasha", { lastName: "Купчик" }),
    ];
    const edges = [
      ["petr", "vasily"],
      ["filip", "agrafena"],
      ["iosif", "grigory"],
      ["grigory", "nadezhda"],
      ["agrafena", "nadezhda"],
      ["vasily", "galina"],
      ["nadezhda", "galina"],
      ["vasily", "nina"],
      ["nadezhda", "nina"],
      ["yustin", "vladimir"],
      ["vladimir", "viktor"],
      ["viktor", "sasha"],
      ["galina", "sasha"],
    ].map(([parentId, childId]) => ({ parentId, childId }));
    const couples = [
      { person1Id: "grigory", person2Id: "agrafena" },
      { person1Id: "vasily", person2Id: "nadezhda" },
      { person1Id: "viktor", person2Id: "galina" },
    ];
    const ids = people.map((p) => p.id);
    const found = findBranches(
      people,
      edges,
      couples,
      computeGenerations(ids, edges, couples),
    );
    expect(
      found.map((b) => [b.surname, b.lineIds.length, b.joinsRootId]),
    ).toEqual([
      ["Козловский", 4, "yustin"],
      ["Купчик", 4, null],
      ["Колесникович", 3, "petr"],
      ["Струневский", 2, "iosif"],
    ]);
  });

  it("follows a branch's path in the order the family reached each place", () => {
    const path = pathOf(model, new Set(branches[0].memberIds));
    expect(path.placeIds).toEqual(["waw", "lviv", "kyiv", "odesa"]);
    expect(path.routeIds.has("minsk>kyiv")).toBe(false);
    expect(path.routeIds.has("kyiv>odesa")).toBe(true);
  });
});

describe("placeStory", () => {
  it("groups a place by meaning", () => {
    const kyiv = placeStory(model, "kyiv");
    expect(kyiv.since).toBe(1967);
    expect(kyiv.births.map((b) => b.personIds[0])).toEqual(["olga", "alex"]);
    expect(kyiv.lives.map((l) => [l.personId, l.from, l.to])).toEqual([
      ["galina", 1967, 2026],
      ["lyudmila", 1967, null],
      ["sergey", 1985, null],
    ]);
    expect(kyiv.marriages).toEqual([
      {
        personIds: ["sergey", "lyudmila"],
        year: 1985,
        eventId: "e4",
        eventType: "marriage",
      },
    ]);
    expect(kyiv.deaths.map((d) => d.personIds[0])).toEqual(["galina"]);
    expect(kyiv.events.map((e) => e.eventId)).toEqual(["e5"]);
  });

  it("marks an undated current residence as such", () => {
    const odesa = placeStory(model, "odesa");
    expect(odesa.lives).toEqual([
      { personId: "olga", from: 2026, fromKnown: false, to: null },
    ]);
    expect(odesa.since).toBeNull();
  });
});
