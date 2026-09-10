import { describe, expect, it } from "vitest";
import { buildTreeLayout } from "./layout";
import { detectOverlaps } from "./collision";
import { CARD_WIDTH, SPOUSE_GAP } from "./subtree";
import { generateRandomFamily } from "./random-graph";
import {
  positionMap,
  findInterleavedSiblingViolation,
  findCrossedTrunkViolation,
} from "./invariants";

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
