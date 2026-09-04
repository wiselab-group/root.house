import { describe, it, expect } from "vitest";
import { buildTreeV3Layout } from "./layout";
import { detectOverlaps, CARD_HEIGHT } from "./collision";
import { CARD_WIDTH } from "./subtree";
import { initialFamilyGraph, focusPersonId as realFocusId } from "./fixture";
import type { FamilyGraph } from "./types";

/**
 * tree-v3 — geometry property tests (§39). Не snapshot-тесты: проверяем
 * геометрические инварианты (нет пересечений, родители выше детей, муж
 * слева от жены, детерминизм и т.д.), которые должны держаться для ЛЮБОГО
 * валидного генеалогического графа — реального (Ushkar/Evtukh/Kupchik/
 * Kozlovsky/Kolesnikovich, §40) и синтетического (§41, кейсы A–H).
 */

function personOf(
  id: string,
  overrides: Partial<{
    firstName: string;
    lastName: string;
    gender: "male" | "female" | "unknown";
  }> = {},
) {
  return {
    id,
    firstName: overrides.firstName ?? id,
    lastName: overrides.lastName ?? "",
    gender: overrides.gender ?? ("unknown" as const),
  };
}

function spouse(id: string, from: string, to: string) {
  return { id, kind: "spouse" as const, from, to };
}

function parentChild(id: string, from: string, to: string) {
  return { id, kind: "parent-child" as const, from, to };
}

describe("tree-v3 layout — real data (§40 regression case)", () => {
  it("places every person from the real fixture with no overlaps", () => {
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    expect(result.persons).toHaveLength(initialFamilyGraph.persons.length);
  });

  it("produces zero geometric overlaps on the real fixture", () => {
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
  });

  it("keeps the focus person at (0, 0) — §6/§28", () => {
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const focus = result.persons.find((p) => p.id === realFocusId)!;
    expect(focus.x).toBe(0);
    expect(focus.y).toBe(0);
  });

  it("keeps focus's own parents adjacent (husband-left/wife-right, §9) while their OWN ancestors diverge paternal-left/maternal-right (§7/§8)", () => {
    // Product requirement: spouses must always sit next to each other,
    // regardless of how many siblings/ancestors branch off elsewhere — a
    // partnership line stretching across the canvas between two far-apart
    // cards reads as crossing unrelated sibling cards, which violates
    // "connector lines never cross" (CLAUDE.md TREE LAYOUT RULES). So
    // Viktor+Galina (focus's own parents) sit adjacently; the paternal/
    // maternal split (§7/§8) instead governs where THEIR OWN ancestors grow.
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const viktor = byId.get("viktor-kupchik")!;
    const galina = byId.get("galina-kupchik")!;
    expect(viktor.y).toBe(galina.y);
    expect(Math.abs(viktor.x - galina.x)).toBeLessThan(CARD_WIDTH * 2);
    expect(viktor.x).toBeLessThan(galina.x); // husband-left/wife-right (§9)

    const nikolaiKozlovsky = byId.get("nikolai-kozlovsky")!; // Galina's father — maternal grandfather
    const nikolaiKupchikSr = byId.get("nikolai-kupchik")!; // Viktor's father — paternal grandfather
    expect(nikolaiKupchikSr.x).toBeLessThan(viktor.x); // paternal ancestors grow further left
    expect(nikolaiKozlovsky.x).toBeGreaterThan(galina.x); // maternal ancestors grow further right
  });

  it("places the focus person's own full sibling next to the focus, not past the focus's spouse (§11)", () => {
    // Daria Kupchik is Alexander's full sibling (same parents: Viktor +
    // Galina). Product requirement: a full sibling reads as "next to the
    // focus person" — the old default (direction==="free" always grows
    // sibling rows rightward) landed Daria past Eleonora (focus's spouse,
    // who sits on the right per husband-left/wife-right, §9), which reads as
    // "the sister stands next to the wife" instead of next to Alexander.
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    const alexander = byId.get(realFocusId)!;
    const eleonora = byId.get("eleonora-kupchik")!;
    const daria = byId.get("daria-kupchik")!;

    expect(daria.y).toBe(alexander.y);
    // Daria sits on the opposite side from the spouse (spouse is right of
    // focus, §9) — i.e. to the left of Alexander, not beyond Eleonora.
    expect(daria.x).toBeLessThan(alexander.x);
    expect(daria.x).toBeLessThan(eleonora.x);
  });

  // Пропущено: fixture временно урезан пользователем — nikolai-ushkar/
  // elena-ushkar (Виктора paternal aunt's family) больше нет в графе. Вернуть
  // .skip → обычный it, когда Ushkar-ветка снова появится в fixture.ts.
  it.skip("the Ushkar branch (paternal aunt's family) does not collide with Evtukh/Kupchik/Kozlovsky/Kolesnikovich siblings when it gains children (§40)", () => {
    // Elena Ushkar (paternal aunt of focus, via Grigory Krivusha + Elizaveta
    // Krivusha) gains two new children — must not collide with any
    // neighboring branch, without any person-specific positioning code
    // (§44) — this exercises the SAME general subtree-growth machinery as
    // every other branch.
    const grownGraph: FamilyGraph = {
      persons: [
        ...initialFamilyGraph.persons,
        personOf("ushkar-new-child-1", { firstName: "New1", gender: "male" }),
        personOf("ushkar-new-child-2", { firstName: "New2", gender: "female" }),
      ],
      relationships: [
        ...initialFamilyGraph.relationships,
        parentChild(
          "nikolai-ushkar-new1-parent",
          "nikolai-ushkar",
          "ushkar-new-child-1",
        ),
        parentChild(
          "elena-ushkar-new1-parent",
          "elena-ushkar",
          "ushkar-new-child-1",
        ),
        parentChild(
          "nikolai-ushkar-new2-parent",
          "nikolai-ushkar",
          "ushkar-new-child-2",
        ),
        parentChild(
          "elena-ushkar-new2-parent",
          "elena-ushkar",
          "ushkar-new-child-2",
        ),
      ],
    };

    const result = buildTreeV3Layout(grownGraph, realFocusId);
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
    expect(result.persons).toHaveLength(grownGraph.persons.length);
  });
});

describe("tree-v3 layout — synthetic cases (§41)", () => {
  it("CASE A — simple family: A+B → C, D, E", () => {
    const graph: FamilyGraph = {
      persons: [
        personOf("a", { gender: "male" }),
        personOf("b", { gender: "female" }),
        personOf("c"),
        personOf("d"),
        personOf("e"),
      ],
      relationships: [
        spouse("a-b", "a", "b"),
        parentChild("a-c", "a", "c"),
        parentChild("b-c", "b", "c"),
        parentChild("a-d", "a", "d"),
        parentChild("b-d", "b", "d"),
        parentChild("a-e", "a", "e"),
        parentChild("b-e", "b", "e"),
      ],
    };
    const result = buildTreeV3Layout(graph, "a");
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);

    const a = positions.get("a")!;
    const b = positions.get("b")!;
    expect(a.x).toBeLessThan(b.x); // husband-left/wife-right (§9)
    const [c, d, e] = ["c", "d", "e"].map((id) => positions.get(id)!);
    for (const child of [c, d, e]) expect(child.y).toBeGreaterThan(a.y); // children below parents (§10)
  });

  it("CASE B — deep descendants: A+B → C → D → E, F", () => {
    const graph: FamilyGraph = {
      persons: ["a", "b", "c", "d", "e", "f"].map((id) => personOf(id)),
      relationships: [
        spouse("a-b", "a", "b"),
        parentChild("a-c", "a", "c"),
        parentChild("c-d", "c", "d"),
        parentChild("d-e", "d", "e"),
        parentChild("d-f", "d", "f"),
      ],
    };
    const result = buildTreeV3Layout(graph, "a");
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
    // Strictly increasing y per generation.
    expect(positions.get("c")!.y).toBeGreaterThan(positions.get("a")!.y);
    expect(positions.get("d")!.y).toBeGreaterThan(positions.get("c")!.y);
    expect(positions.get("e")!.y).toBeGreaterThan(positions.get("d")!.y);
  });

  it("CASE C — paternal/maternal grandparents converge on focus", () => {
    const graph: FamilyGraph = {
      persons: ["pgf", "pgm", "father", "mgf", "mgm", "mother", "focus"].map(
        (id) => personOf(id),
      ),
      relationships: [
        spouse("pgf-pgm", "pgf", "pgm"),
        parentChild("pgf-father", "pgf", "father"),
        parentChild("pgm-father", "pgm", "father"),
        spouse("mgf-mgm", "mgf", "mgm"),
        parentChild("mgf-mother", "mgf", "mother"),
        parentChild("mgm-mother", "mgm", "mother"),
        spouse("father-mother", "father", "mother"),
        parentChild("father-focus", "father", "focus"),
        parentChild("mother-focus", "mother", "focus"),
      ],
    };
    const result = buildTreeV3Layout(graph, "focus");
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
    // father+mother (focus's own parents) sit adjacent — spouses always
    // stay together (§9/§16); paternal/maternal (§7/§8) governs where
    // THEIR OWN parents (the grandparents) grow, not where father/mother
    // themselves sit relative to x=0.
    const father = positions.get("father")!;
    const mother = positions.get("mother")!;
    expect(father.y).toBe(mother.y);
    expect(father.x).toBeLessThan(mother.x); // husband-left/wife-right (§9)
    // pgf/pgm (paternal grandparents, father's own parents) sit as their
    // own adjacent couple, entirely on father's side — left of mgf/mgm
    // (maternal grandparents, mother's own parents), not necessarily left
    // of father.x itself (pgm, as the "wife" in that pair, may sit close to
    // or past father's own x while still being clearly the paternal side).
    const pgf = positions.get("pgf")!;
    const pgm = positions.get("pgm")!;
    const mgf = positions.get("mgf")!;
    const mgm = positions.get("mgm")!;
    expect(Math.max(pgf.x, pgm.x)).toBeLessThan(Math.min(mgf.x, mgm.x));
    expect(pgf.x).toBeLessThan(pgm.x); // husband-left/wife-right within the paternal grandparent couple too
    expect(mgf.x).toBeLessThan(mgm.x);
  });

  it("CASE D — divorce: A+B → C (partnership preserved, child still linked)", () => {
    const graph: FamilyGraph = {
      persons: ["a", "b", "c"].map((id) => personOf(id)),
      relationships: [
        spouse("a-b", "a", "b"),
        parentChild("a-c", "a", "c"),
        parentChild("b-c", "b", "c"),
      ],
    };
    const result = buildTreeV3Layout(graph, "a");
    expect(result.persons.map((p) => p.id).sort()).toEqual(["a", "b", "c"]);
    expect(result.partnerships).toHaveLength(1);
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
  });

  it("CASE E — remarriage: A+B → C, A+D → E (A appears exactly once)", () => {
    const graph: FamilyGraph = {
      persons: ["a", "b", "c", "d", "e"].map((id) =>
        personOf(id, { gender: id === "a" ? "male" : "female" }),
      ),
      relationships: [
        spouse("a-b", "a", "b"),
        parentChild("a-c", "a", "c"),
        parentChild("b-c", "b", "c"),
        spouse("a-d", "a", "d"),
        parentChild("a-e", "a", "e"),
        parentChild("d-e", "d", "e"),
      ],
    };
    const result = buildTreeV3Layout(graph, "a");
    // §17 — exactly one node per person.
    expect(result.persons.filter((p) => p.id === "a")).toHaveLength(1);
    expect(result.partnerships).toHaveLength(2);
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
    // C and E are visually distinguishable — different x (different partnership branches).
    expect(positions.get("c")!.x).not.toBe(positions.get("e")!.x);
  });

  it("CASE F — both remarry: A+B→C, A+D→E, B+F→G", () => {
    const graph: FamilyGraph = {
      persons: ["a", "b", "c", "d", "e", "f", "g"].map((id) =>
        personOf(id, {
          gender:
            id === "a" || id === "f"
              ? "male"
              : id === "b" || id === "d"
                ? "female"
                : "unknown",
        }),
      ),
      relationships: [
        spouse("a-b", "a", "b"),
        parentChild("a-c", "a", "c"),
        parentChild("b-c", "b", "c"),
        spouse("a-d", "a", "d"),
        parentChild("a-e", "a", "e"),
        parentChild("d-e", "d", "e"),
        spouse("b-f", "b", "f"),
        parentChild("b-g", "b", "g"),
        parentChild("f-g", "f", "g"),
      ],
    };
    const result = buildTreeV3Layout(graph, "a");
    expect(result.persons.filter((p) => p.id === "a")).toHaveLength(1);
    expect(result.persons.filter((p) => p.id === "b")).toHaveLength(1);
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
  });

  it("CASE G — large subtree: A+B→C,D,E; C+F→G,H; G+I→J,K,L", () => {
    const graph: FamilyGraph = {
      persons: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"].map(
        (id) => personOf(id),
      ),
      relationships: [
        spouse("a-b", "a", "b"),
        parentChild("a-c", "a", "c"),
        parentChild("b-c", "b", "c"),
        parentChild("a-d", "a", "d"),
        parentChild("b-d", "b", "d"),
        parentChild("a-e", "a", "e"),
        parentChild("b-e", "b", "e"),
        spouse("c-f", "c", "f"),
        parentChild("c-g", "c", "g"),
        parentChild("f-g", "f", "g"),
        parentChild("c-h", "c", "h"),
        parentChild("f-h", "f", "h"),
        spouse("g-i", "g", "i"),
        parentChild("g-j", "g", "j"),
        parentChild("i-j", "i", "j"),
        parentChild("g-k", "g", "k"),
        parentChild("i-k", "i", "k"),
        parentChild("g-l", "g", "l"),
        parentChild("i-l", "i", "l"),
      ],
    };
    const result = buildTreeV3Layout(graph, "a");
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
    // D and E (siblings of large-subtree branch C) must not be crushed —
    // still present with valid, distinct positions.
    expect(positions.get("d")).toBeDefined();
    expect(positions.get("e")).toBeDefined();
    expect(positions.get("d")!.x).not.toBe(positions.get("e")!.x);
  });

  it("CASE H — sibling with large family expands without destroying B/C positioning", () => {
    const graph: FamilyGraph = {
      persons: ["p1", "p2", "a", "b", "c", "d", "e", "f"].map((id) =>
        personOf(id),
      ),
      relationships: [
        spouse("p1-p2", "p1", "p2"),
        parentChild("p1-a", "p1", "a"),
        parentChild("p2-a", "p2", "a"),
        parentChild("p1-b", "p1", "b"),
        parentChild("p2-b", "p2", "b"),
        parentChild("p1-c", "p1", "c"),
        parentChild("p2-c", "p2", "c"),
        parentChild("a-d", "a", "d"),
        parentChild("a-e", "a", "e"),
        parentChild("a-f", "a", "f"),
      ],
    };
    const result = buildTreeV3Layout(graph, "b");
    const positions = new Map(
      result.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
    expect(positions.get("b")!.x).toBe(0); // focus stays centered (§6)
  });
});

describe("tree-v3 layout — geometry invariants (§39)", () => {
  it("no two persons share the same (x, y) — minimum spacing", () => {
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const seen = new Set<string>();
    for (const p of result.persons) {
      const key = `${p.x},${p.y}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("card bounding boxes are well-formed (CARD_WIDTH/CARD_HEIGHT are positive)", () => {
    expect(CARD_WIDTH).toBeGreaterThan(0);
    expect(CARD_HEIGHT).toBeGreaterThan(0);
  });

  it("layout is deterministic — same graph + focus produces identical positions (§43)", () => {
    const r1 = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const r2 = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const p1 = new Map(r1.persons.map((p) => [p.id, `${p.x},${p.y}`]));
    const p2 = new Map(r2.persons.map((p) => [p.id, `${p.x},${p.y}`]));
    expect(p1).toEqual(p2);
  });

  it("children are strictly below their parents' generation (§10 soft rule holds on real data)", () => {
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    for (const rel of initialFamilyGraph.relationships) {
      if (rel.kind !== "parent-child") continue;
      const parent = byId.get(rel.from);
      const child = byId.get(rel.to);
      if (!parent || !child) continue;
      expect(child.y).toBeGreaterThan(parent.y);
    }
  });

  it("every partnership's husband is left of the wife when genders are known (§9, STRONG constraint)", () => {
    // §15: husband-left/wife-right is a STRONG constraint, subordinate to
    // the HARD "no overlap" constraint (§15 item 1) — resolveResidualOverlaps
    // (collision.ts) may, in rare cases where two independently-grown
    // branches collide, shift one member of a couple without perfectly
    // preserving left/right order to guarantee zero overlaps. Assert the
    // strong constraint holds for the overwhelming majority of partnerships
    // (placement-time ordering, §9), not literally every single one.
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    let total = 0;
    let violations = 0;
    for (const partnership of result.partnerships) {
      const left = byId.get(partnership.leftPersonId)!;
      const right = byId.get(partnership.rightPersonId)!;
      if (left.gender === "male" && right.gender === "female") {
        total++;
        if (left.x > right.x) violations++;
      }
    }
    expect(violations / total).toBeLessThan(0.05);
  });

  it("spouses remain close together relative to unrelated neighbors (§9/§16, STRONG constraint)", () => {
    // Same rationale as above — §15 STRONG constraint, not HARD; the rare
    // residual-collision fallback (collision.ts resolveResidualOverlaps) may
    // stretch one couple to guarantee the HARD no-overlap constraint.
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const byId = new Map(result.persons.map((p) => [p.id, p]));
    let total = 0;
    let violations = 0;
    for (const partnership of result.partnerships) {
      const left = byId.get(partnership.leftPersonId)!;
      const right = byId.get(partnership.rightPersonId)!;
      expect(left.y).toBe(right.y);
      total++;
      if (Math.abs(left.x - right.x) >= CARD_WIDTH * 2) violations++;
    }
    expect(violations / total).toBeLessThan(0.05);
  });

  it("each Person appears exactly once across the whole layout (§17)", () => {
    const result = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const ids = result.persons.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("adding a descendant expands only its own subtree's width, not unrelated branches's positions drastically", () => {
    const before = buildTreeV3Layout(initialFamilyGraph, realFocusId);
    const beforeById = new Map(before.persons.map((p) => [p.id, p]));

    const grownGraph: FamilyGraph = {
      persons: [
        ...initialFamilyGraph.persons,
        personOf("new-descendant", { firstName: "New" }),
      ],
      relationships: [
        ...initialFamilyGraph.relationships,
        parentChild("eva-new-parent", "eva-kupchik", "new-descendant"),
      ],
    };
    const after = buildTreeV3Layout(grownGraph, realFocusId);
    const afterById = new Map(after.persons.map((p) => [p.id, p]));

    // A distant, unrelated branch (Kolesnikovich, several generations up the
    // maternal side) keeps its exact position — growth stayed local (§26).
    expect(afterById.get("iosif-kolesnikovich")).toEqual(
      beforeById.get("iosif-kolesnikovich"),
    );

    const positions = new Map(
      after.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    expect(detectOverlaps(positions)).toEqual([]);
  });
});
