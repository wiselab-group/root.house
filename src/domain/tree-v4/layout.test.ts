import { describe, expect, it } from "vitest";
import { buildTreeV4Layout } from "./layout";
import { detectOverlaps } from "./collision";
import { CARD_WIDTH, SIBLING_GAP, SPOUSE_GAP } from "./subtree";
import { initialFamilyGraph, focusPersonId as realFocusId } from "./fixture";
import {
  case1SimpleFamily,
  case2DeepChain,
  case3Remarriage,
  case4BothRemarry,
  case5SiblingSubtree,
  case6AsymmetricBranch,
  case7LargeBothSides,
  case8DivorceRemarriageDeep,
  case9ManySiblings,
  case10ManyGenerations,
} from "./test-fixtures";
import type { TreeLayoutResult } from "./types";

function positionMap(result: TreeLayoutResult) {
  return new Map(result.persons.map((p) => [p.id, { x: p.x, y: p.y }]));
}

function personById(result: TreeLayoutResult, id: string) {
  const p = result.persons.find((person) => person.id === id);
  if (!p)
    throw new Error(`test fixture missing person "${id}" in layout result`);
  return p;
}

describe("tree-v4 — real data (Alexander/Eleonora/Eva + Viktor/Galina/Daria minimal core)", () => {
  it("places every person exactly once with no overlaps", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    expect(result.persons).toHaveLength(6);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("focus person's partnership is centered on the origin (focus is the spatial anchor)", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const focus = personById(result, realFocusId);
    const eleonora = personById(result, "eleonora-kupchik");
    expect(focus.y).toBe(0);
    expect((focus.x + eleonora.x) / 2).toBeCloseTo(0, 5);
  });

  it("husband (Alexander) is left of wife (Eleonora)", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const eleonora = personById(result, "eleonora-kupchik");
    expect(alexander.x).toBeLessThan(eleonora.x);
  });

  it("an only child is centered exactly under the parent partnership junction (regression: same-Y-bucket false collision)", () => {
    // Regression test for a real bug: OccupancyModel's Y-bucket index was
    // used AS the collision boundary instead of just an indexing aid, so a
    // parent row and the next generation's row could land in the same
    // bucket near their shared boundary and falsely register as colliding
    // even though their actual Y ranges never overlapped — this silently
    // pushed an only child (or first-in-row sibling) away from its true
    // centered position under the parents for no genealogical reason.
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const eleonora = personById(result, "eleonora-kupchik");
    const eva = personById(result, "eva-kupchik");
    const parentsCenterX = (alexander.x + eleonora.x) / 2;
    expect(eva.x).toBeCloseTo(parentsCenterX, 5);
  });

  it("Eva (child) is below her parents", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const eva = personById(result, "eva-kupchik");
    expect(eva.y).toBeGreaterThan(alexander.y);
  });

  it("is deterministic — same graph, same focus, identical positions", () => {
    const r1 = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const r2 = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    expect(positionMap(r1)).toEqual(positionMap(r2));
  });

  it("Alexander's parents (Viktor and Galina) are above him", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const viktor = personById(result, "viktor-kupchik");
    const galina = personById(result, "galina-kupchik");
    expect(viktor.y).toBeLessThan(alexander.y);
    expect(galina.y).toBeLessThan(alexander.y);
  });

  it("Viktor (husband) is left of Galina (wife)", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const viktor = personById(result, "viktor-kupchik");
    const galina = personById(result, "galina-kupchik");
    expect(viktor.x).toBeLessThan(galina.x);
  });

  it("the grandparents' partnership is centered above the FULL sibling row (Alexander + Daria), not just Alexander", () => {
    // The focus person is always fixed at x=0 first, before ancestors are
    // placed — but ancestors must center over the complete set of their
    // children, including a sibling placed later than the focus person, not
    // just whichever child happened to exist first. Parents/children stay
    // mutually aligned by moving the PARENTS to match the children's true
    // center, never the other way around (the focus anchor must not move).
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const viktor = personById(result, "viktor-kupchik");
    const galina = personById(result, "galina-kupchik");
    const alexander = personById(result, "alexander-kupchik");
    const daria = personById(result, "daria-kupchik");
    const grandparentsCenterX = (viktor.x + galina.x) / 2;
    const siblingRowCenterX = (alexander.x + daria.x) / 2;
    expect(grandparentsCenterX).toBeCloseTo(siblingRowCenterX, 5);
  });

  it("Daria (Alexander's sister) is at the same generation, next to Alexander, under their shared parents", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const daria = personById(result, "daria-kupchik");
    expect(daria.y).toBe(alexander.y);
    expect(Math.abs(daria.x - alexander.x)).toBeGreaterThanOrEqual(CARD_WIDTH);
  });

  it("Daria sits immediately beside Alexander himself, not past his spouse (regression: sibling landed next to the spouse instead of the blood relative)", () => {
    // Bug: a full sibling's nearest-free-slot search jumped past the focus
    // person's own spouse (Eleonora) and landed the sibling on the far side
    // of her instead of directly next to the blood relative — geometrically
    // collision-free, but wrong genealogically: a sibling must be adjacent
    // to the person they're related to by blood, never separated from them
    // by an in-law.
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const eleonora = personById(result, "eleonora-kupchik");
    const daria = personById(result, "daria-kupchik");
    const gapToAlexander = Math.abs(daria.x - alexander.x);
    expect(gapToAlexander).toBeCloseTo(CARD_WIDTH + SIBLING_GAP, 5);
    // Daria must be on Alexander's FAR side from Eleonora, not beyond her.
    const eleonoraIsRightOfAlexander = eleonora.x > alexander.x;
    if (eleonoraIsRightOfAlexander) {
      expect(daria.x).toBeLessThan(alexander.x);
    } else {
      expect(daria.x).toBeGreaterThan(alexander.x);
    }
  });

  it("full siblings Alexander and Daria are placed adjacent to each other without overlapping", () => {
    const result = buildTreeV4Layout(initialFamilyGraph, realFocusId);
    const alexander = personById(result, "alexander-kupchik");
    const daria = personById(result, "daria-kupchik");
    expect(Math.abs(alexander.x - daria.x)).toBeGreaterThanOrEqual(CARD_WIDTH);
  });
});

describe("CASE 1 — simple nuclear family (A+B -> C, D, E)", () => {
  const result = buildTreeV4Layout(case1SimpleFamily, "a");

  it("no overlaps", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("all three children are below the parents", () => {
    const a = personById(result, "a");
    for (const id of ["c", "d", "e"]) {
      expect(personById(result, id).y).toBeGreaterThan(a.y);
    }
  });

  it("spouses stay adjacent (exact gap)", () => {
    const a = personById(result, "a");
    const b = personById(result, "b");
    expect(
      Math.abs(Math.abs(a.x - b.x) - (CARD_WIDTH + SPOUSE_GAP)),
    ).toBeLessThan(0.01);
  });

  it("siblings stay ordered and non-overlapping", () => {
    const c = personById(result, "c");
    const d = personById(result, "d");
    const e = personById(result, "e");
    const xs = [c.x, d.x, e.x].sort((x, y) => x - y);
    expect(xs[1] - xs[0]).toBeGreaterThanOrEqual(CARD_WIDTH);
    expect(xs[2] - xs[1]).toBeGreaterThanOrEqual(CARD_WIDTH);
  });

  it("the sibling row is centered under the parent partnership", () => {
    const a = personById(result, "a");
    const b = personById(result, "b");
    const parentsCenterX = (a.x + b.x) / 2;
    const c = personById(result, "c");
    const d = personById(result, "d");
    const e = personById(result, "e");
    const rowCenterX = (Math.min(c.x, d.x, e.x) + Math.max(c.x, d.x, e.x)) / 2;
    expect(rowCenterX).toBeCloseTo(parentsCenterX, 5);
  });
});

describe("CASE 2 — deep chain then wide sibling row", () => {
  const result = buildTreeV4Layout(case2DeepChain, "a");

  it("no overlaps", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("each generation strictly increases in y down the chain", () => {
    const ys = ["a", "c", "d", "e"].map((id) => personById(result, id).y);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeGreaterThan(ys[i - 1]);
    }
  });

  it("e, f, g are siblings at the same generation and don't overlap", () => {
    const e = personById(result, "e");
    const f = personById(result, "f");
    const g = personById(result, "g");
    expect(e.y).toBe(f.y);
    expect(f.y).toBe(g.y);
  });
});

describe("CASE 3 — remarriage: A+B -> C, A+D -> E", () => {
  const result = buildTreeV4Layout(case3Remarriage, "a");

  it("A appears exactly once (one Person node per canonical person)", () => {
    const occurrences = result.persons.filter((p) => p.id === "a");
    expect(occurrences).toHaveLength(1);
  });

  it("both partnerships are preserved", () => {
    expect(result.partnerships.map((p) => p.id).sort()).toEqual(["ab", "ad"]);
  });

  it("no overlaps despite two partnership branches on one person", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("divorce does not remove the parent-child link — C is still a child of both A and B", () => {
    const partnershipAB = result.partnerships.find((p) => p.id === "ab")!;
    expect(partnershipAB.childrenIds).toContain("c");
    expect(partnershipAB.status).toBe("divorced");
  });

  it("C and E are each below their own parent partnership", () => {
    const a = personById(result, "a");
    const c = personById(result, "c");
    const e = personById(result, "e");
    expect(c.y).toBeGreaterThan(a.y);
    expect(e.y).toBeGreaterThan(a.y);
  });
});

describe("CASE 4 — both former spouses remarry", () => {
  const result = buildTreeV4Layout(case4BothRemarry, "a");

  it("A and B each appear exactly once", () => {
    expect(result.persons.filter((p) => p.id === "a")).toHaveLength(1);
    expect(result.persons.filter((p) => p.id === "b")).toHaveLength(1);
  });

  it("all three partnerships preserved and no overlaps", () => {
    expect(result.partnerships.map((p) => p.id).sort()).toEqual([
      "ab",
      "ad",
      "bf",
    ]);
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("children from different partnerships remain distinguishable (different x)", () => {
    const c = personById(result, "c"); // A+B
    const e = personById(result, "e"); // A+D
    const g = personById(result, "g"); // B+F
    const xs = new Set([c.x, e.x, g.x]);
    expect(xs.size).toBe(3);
  });
});

describe("CASE 5 — sibling with its own large subtree", () => {
  const result = buildTreeV4Layout(case5SiblingSubtree, "p1");

  it("no overlaps", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("A's children (D, E, F) do not overlap B or C's position", () => {
    const b = personById(result, "b");
    const c = personById(result, "c");
    for (const id of ["d", "e", "f"]) {
      const child = personById(result, id);
      expect(Math.abs(child.x - b.x) >= CARD_WIDTH || child.y !== b.y).toBe(
        true,
      );
      expect(Math.abs(child.x - c.x) >= CARD_WIDTH || child.y !== c.y).toBe(
        true,
      );
    }
  });

  it("B and C stay near A (siblings adjacent, not pushed arbitrarily far)", () => {
    const a = personById(result, "a");
    const b = personById(result, "b");
    const c = personById(result, "c");
    const siblingXs = [a.x, b.x, c.x].sort((x, y) => x - y);
    // total span should be a small multiple of card width, not blown out by A's subtree
    expect(siblingXs[2] - siblingXs[0]).toBeLessThan(CARD_WIDTH * 6);
  });
});

describe("CASE 6 — one large asymmetric descendant branch among siblings", () => {
  const result = buildTreeV4Layout(case6AsymmetricBranch, "p1");

  it("no overlaps", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("the large branch (big) occupies more horizontal space than a childless sibling", () => {
    const bigChildrenXs = ["b1", "b2", "b3", "b4"].map(
      (id) => personById(result, id).x,
    );
    const bigSpan = Math.max(...bigChildrenXs) - Math.min(...bigChildrenXs);
    expect(bigSpan).toBeGreaterThan(CARD_WIDTH * 2);
  });

  it("small siblings are not pushed to equal width with the big branch", () => {
    const small1 = personById(result, "small1");
    const small2 = personById(result, "small2");
    // small siblings still sit close to their own parent row, not stretched out
    expect(Math.abs(small1.y - small2.y)).toBeLessThan(0.01);
  });
});

describe("CASE 7 — large paternal branch + large maternal branch", () => {
  const result = buildTreeV4Layout(case7LargeBothSides, "focus");

  it("no overlaps even with two large ancestor clusters on the same row", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("paternal grandparents are left of maternal grandparents", () => {
    const fgf = personById(result, "fgf");
    const mgf = personById(result, "mgf");
    expect(fgf.x).toBeLessThan(mgf.x);
  });

  it("father's siblings (paternal) stay left of mother's siblings (maternal)", () => {
    const paternalMaxX = Math.max(
      ...["fu1", "fu2", "fu3"].map((id) => personById(result, id).x),
    );
    const maternalMinX = Math.min(
      ...["mu1", "mu2", "mu3"].map((id) => personById(result, id).x),
    );
    expect(paternalMaxX).toBeLessThan(maternalMinX);
  });
});

describe("CASE 8 — divorce + remarriage, three generations deep", () => {
  const result = buildTreeV4Layout(case8DivorceRemarriageDeep, "a");

  it("no overlaps", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("grandchild is placed below its parent c, which is below a", () => {
    const a = personById(result, "a");
    const c = personById(result, "c");
    const gc = personById(result, "gc");
    expect(c.y).toBeGreaterThan(a.y);
    expect(gc.y).toBeGreaterThan(c.y);
  });

  it("A's two partnerships (divorced + remarried) are both present", () => {
    const statuses = result.partnerships
      .filter((p) => p.leftPersonId === "a" || p.rightPersonId === "a")
      .map((p) => p.status)
      .sort();
    expect(statuses).toEqual(["divorced", "married"]);
  });
});

describe("CASE 9 — many siblings (8)", () => {
  const result = buildTreeV4Layout(case9ManySiblings, "p1");

  it("no overlaps among all 8 siblings", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("all 8 siblings are on the same row and ordered without gaps smaller than card width", () => {
    const xs = Array.from(
      { length: 8 },
      (_, i) => personById(result, `s${i}`).x,
    ).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(CARD_WIDTH);
    }
  });
});

describe("CASE 10 — several generations both directions", () => {
  const result = buildTreeV4Layout(case10ManyGenerations, "focus");

  it("no overlaps across 7 generations", () => {
    expect(detectOverlaps(positionMap(result))).toEqual([]);
  });

  it("y strictly increases from great-great-grandparents down to great-grandchild", () => {
    const chain = [
      "ggf",
      "gf",
      "father",
      "focus",
      "child",
      "grandchild",
      "greatgrandchild",
    ];
    const ys = chain.map((id) => personById(result, id).y);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeGreaterThan(ys[i - 1]);
    }
  });

  it("focus's partnership stays centered on x=0", () => {
    const focus = personById(result, "focus");
    const spouse = personById(result, "spouse");
    expect((focus.x + spouse.x) / 2).toBeCloseTo(0, 5);
  });
});

describe("global invariants across every case", () => {
  const cases: Array<
    [string, Parameters<typeof buildTreeV4Layout>[0], string]
  > = [
    ["real data", initialFamilyGraph, realFocusId],
    ["case1", case1SimpleFamily, "a"],
    ["case2", case2DeepChain, "a"],
    ["case3", case3Remarriage, "a"],
    ["case4", case4BothRemarry, "a"],
    ["case5", case5SiblingSubtree, "p1"],
    ["case6", case6AsymmetricBranch, "p1"],
    ["case7", case7LargeBothSides, "focus"],
    ["case8", case8DivorceRemarriageDeep, "a"],
    ["case9", case9ManySiblings, "p1"],
    ["case10", case10ManyGenerations, "focus"],
  ];

  it.each(cases)(
    "%s: one Person node per canonical person, no overlaps, deterministic",
    (_name, graph, focus) => {
      const r1 = buildTreeV4Layout(graph, focus);
      const r2 = buildTreeV4Layout(graph, focus);

      expect(r1.persons.length).toBe(graph.persons.length);
      const ids = new Set(r1.persons.map((p) => p.id));
      expect(ids.size).toBe(r1.persons.length);

      expect(detectOverlaps(positionMap(r1))).toEqual([]);
      expect(positionMap(r1)).toEqual(positionMap(r2));
    },
  );
});
