import { describe, expect, it } from "vitest";
import { buildTreeLayout } from "./layout";
import { detectOverlaps } from "./collision";
import { CARD_WIDTH, SPOUSE_GAP } from "./subtree";
import { generateRandomFamily } from "./random-graph";
import type { TreeLayoutResult } from "./types";

/**
 * Property-based global invariant tests (rewrite plan §8a) — run the SAME
 * small set of universal rules against many randomly generated family
 * graphs, seeded and reproducible, instead of accumulating one regression
 * test per historically-found bug against a single fixture (layout.test.ts's
 * pre-rewrite pattern). A failure here always prints the failing seed.
 *
 * Stage 1 scope (see rewrite plan §7): generateRandomFamily only produces
 * descendant-only graphs (a single root grown downward) — ancestor-side
 * property coverage (sideConstraint never violated, etc.) lands once
 * growBranch("up") exists in a later stage.
 */

const SEED_COUNT = 300;
const SIZES = [3, 8, 20, 50];

function positionMap(result: TreeLayoutResult) {
  return new Map(result.persons.map((p) => [p.id, { x: p.x, y: p.y }]));
}

/**
 * "Full siblings adjacent" as a checkable geometric property: for every pair
 * of full siblings (same exact parentIds set) on the SAME resolved y, the
 * only thing allowed to sit between two of them is one sibling's OWN spouse
 * card (a married-in in-law legitimately occupies the space right next to
 * their partner, inside the sibling row — CLAUDE.md's own "spouses always
 * adjacent" rule) — never an unrelated third party's card.
 */
function findInterleavedSiblingViolation(
  result: TreeLayoutResult,
): string | null {
  // A person can have MULTIPLE partnerships (remarriage) — must collect
  // every spouse, not just the last one a naive Map<string,string> would
  // keep (that undercounting was a real bug in an earlier version of this
  // checker: it silently dropped two of a thrice-married person's three
  // spouses from the "allowed between siblings" set, producing a false
  // positive).
  const spousesOf = new Map<string, Set<string>>();
  const addSpouse = (a: string, b: string) => {
    if (!spousesOf.has(a)) spousesOf.set(a, new Set());
    spousesOf.get(a)!.add(b);
  };
  for (const partnership of result.partnerships) {
    addSpouse(partnership.leftPersonId, partnership.rightPersonId);
    addSpouse(partnership.rightPersonId, partnership.leftPersonId);
  }

  const byParents = new Map<string, typeof result.persons>();
  for (const p of result.persons) {
    const key = [...p.parentIds].sort().join("|");
    if (!key) continue; // no recorded parents — not a sibling group
    if (!byParents.has(key)) byParents.set(key, []);
    byParents.get(key)!.push(p);
  }

  for (const [key, siblings] of byParents) {
    if (siblings.length < 2) continue;
    const sameRow = siblings.filter((s) => s.y === siblings[0].y);
    if (sameRow.length < 2) continue; // elastic Y (later stages) may split a row — not a Stage 1 concern
    const sorted = [...sameRow].sort((a, b) => a.x - b.x);
    const siblingIds = new Set(sameRow.map((s) => s.id));
    // Anyone married to a sibling in this group is allowed to sit between
    // two siblings — that's their own spouse's card, not a foreign
    // interloper. A sibling can have several spouses (remarriage) — all of
    // them are legitimate occupants of the row, not just one.
    const allowedSpouseIds = new Set(
      sameRow.flatMap((s) => [...(spousesOf.get(s.id) ?? [])]),
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const left = sorted[i];
      const right = sorted[i + 1];
      const between = result.persons.filter(
        (p) =>
          p.y === left.y &&
          p.x > left.x &&
          p.x < right.x &&
          !siblingIds.has(p.id) &&
          !allowedSpouseIds.has(p.id),
      );
      if (between.length > 0) {
        return `sibling group ${key}: foreign person(s) ${between.map((p) => p.id).join(",")} interleaved between ${left.id} and ${right.id}`;
      }
    }
  }
  return null;
}

/**
 * "Lines never cross" as a checkable geometric property, restricted to what
 * Stage 1 can produce (parent-child trunks only, no ancestor lines yet):
 * for every partnership with 2+ children on the same row, the children's
 * x-order must match a consistent left-to-right order with no two children's
 * trunks needing to cross — trivially true once growBranch places each
 * child's full subtree as one contiguous reserved block (see subtree.ts) but
 * checked explicitly here as a property, not assumed from the code.
 */
function findCrossedTrunkViolation(result: TreeLayoutResult): string | null {
  const byPartnership = new Map<string, typeof result.persons>();
  for (const partnership of result.partnerships) {
    const children = result.persons.filter((p) =>
      partnership.childrenIds.includes(p.id),
    );
    if (children.length < 2) continue;
    byPartnership.set(partnership.id, children);
  }
  for (const [partnershipId, children] of byPartnership) {
    const sameRow = children.filter((c) => c.y === children[0].y);
    if (sameRow.length < 2) continue;
    // Children should already come out of buildTreeLayout in left-to-right
    // x order for one partnership's row — verify it holds, i.e. no pair is
    // "crossed" relative to insertion order into childrenIds.
    const byChildrenIdsOrder = partnershipChildrenOrder(
      partnershipId,
      result,
    );
    const sortedByX = [...sameRow].sort((a, b) => a.x - b.x).map((c) => c.id);
    const filteredOrder = byChildrenIdsOrder.filter((id) =>
      sortedByX.includes(id),
    );
    if (JSON.stringify(sortedByX) !== JSON.stringify(filteredOrder)) {
      return `partnership ${partnershipId}: children x-order ${JSON.stringify(sortedByX)} does not match graph order ${JSON.stringify(filteredOrder)}`;
    }
  }
  return null;
}

function partnershipChildrenOrder(
  partnershipId: string,
  result: TreeLayoutResult,
): string[] {
  const partnership = result.partnerships.find((p) => p.id === partnershipId);
  return partnership?.childrenIds ?? [];
}

describe("layout engine — property-based invariants (random descendant-only graphs)", () => {
  for (const personCount of SIZES) {
    describe(`personCount=${personCount}`, () => {
      for (let seed = 0; seed < SEED_COUNT / SIZES.length; seed++) {
        it(`seed=${seed}: no card overlaps, no interleaved siblings, no crossed trunks, deterministic`, () => {
          const { graph, focusPersonId } = generateRandomFamily({
            seed: seed * 1000 + personCount,
            personCount,
          });

          const result = buildTreeLayout(graph, focusPersonId);

          const overlaps = detectOverlaps(positionMap(result));
          expect(
            overlaps,
            `card overlaps at seed=${seed} personCount=${personCount}: ${JSON.stringify(overlaps)}`,
          ).toEqual([]);

          const siblingViolation = findInterleavedSiblingViolation(result);
          expect(
            siblingViolation,
            `sibling interleaving at seed=${seed} personCount=${personCount}`,
          ).toBeNull();

          const crossedTrunk = findCrossedTrunkViolation(result);
          expect(
            crossedTrunk,
            `crossed trunk at seed=${seed} personCount=${personCount}`,
          ).toBeNull();

          // Determinism: rebuilding from the SAME graph/focus must be
          // byte-identical (same x/y for every person, same partnership
          // junctions) — buildTreeLayout must have no hidden non-determinism
          // (Map iteration order, Math.random, etc).
          const result2 = buildTreeLayout(graph, focusPersonId);
          expect(positionMap(result2)).toEqual(positionMap(result));
        });
      }
    });
  }

  it("every FIRST (non-remarried) couple sits at exactly CARD_WIDTH+SPOUSE_GAP apart, across many random graphs", () => {
    // Only meaningful for a couple where NEITHER spouse has a second
    // partnership: a remarried person's own card is placed once (their
    // FIRST partnership's branch), and a later partnership's branch is
    // grown outward, side by side, from that fixed card — a spouse from
    // that second branch is legitimately NOT adjacent to the person's own
    // card (see growSpouseOwnPartnershipsDown), which is intentional
    // remarriage behavior, not a spouse-gap violation.
    const expectedGap = CARD_WIDTH + SPOUSE_GAP;
    for (let seed = 0; seed < 40; seed++) {
      const { graph, focusPersonId } = generateRandomFamily({
        seed,
        personCount: 25,
      });
      const result = buildTreeLayout(graph, focusPersonId);
      const positions = positionMap(result);
      const partnershipCountByPerson = new Map<string, number>();
      for (const partnership of result.partnerships) {
        for (const id of [partnership.leftPersonId, partnership.rightPersonId]) {
          partnershipCountByPerson.set(
            id,
            (partnershipCountByPerson.get(id) ?? 0) + 1,
          );
        }
      }

      for (const partnership of result.partnerships) {
        if (
          (partnershipCountByPerson.get(partnership.leftPersonId) ?? 0) > 1 ||
          (partnershipCountByPerson.get(partnership.rightPersonId) ?? 0) > 1
        ) {
          continue; // remarried — not adjacent by construction, see above
        }
        const leftPos = positions.get(partnership.leftPersonId);
        const rightPos = positions.get(partnership.rightPersonId);
        if (!leftPos || !rightPos) continue;
        if (leftPos.y !== rightPos.y) continue;
        const gap = Math.abs(rightPos.x - leftPos.x);
        expect(
          gap,
          `seed=${seed} partnership ${partnership.id}: expected spouse gap ${expectedGap}, got ${gap}`,
        ).toBeCloseTo(expectedGap, 5);
      }
    }
  });
});
