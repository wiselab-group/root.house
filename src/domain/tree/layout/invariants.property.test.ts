import { describe, expect, it } from "vitest";
import { buildTreeLayout } from "./layout";
import { detectOverlaps } from "./collision";
import { CARD_WIDTH, SPOUSE_GAP } from "./subtree";
import { generateRandomFamily } from "./random-graph";
import {
  positionMap,
  findInterleavedSiblingViolation,
  findCrossedTrunkViolation,
  findSideConstraintViolation,
} from "./invariants";

/**
 * Property-based global invariant tests (rewrite plan §8a) — run the SAME
 * small set of universal rules against many randomly generated family
 * graphs, seeded and reproducible, instead of accumulating one regression
 * test per historically-found bug against a single fixture (layout.test.ts's
 * pre-rewrite pattern). A failure here always prints the failing seed.
 *
 * Two describe blocks: the first (Stage 1, generateRandomFamily's default
 * direction:"down") covers pure descendant-only graphs; the second (Stage 3)
 * additionally exercises growBranch("up") and growInLawAncestors via
 * direction:"up", including the sideConstraint invariant (paternal strictly
 * left / maternal strictly right) that only ancestor placement can violate.
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
        for (const id of [
          partnership.leftPersonId,
          partnership.rightPersonId,
        ]) {
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

/**
 * Stage 3 (rewrite plan §7): the same invariants, PLUS sideConstraint, on
 * graphs that also grow ancestors above the root (growBranch("up")) and
 * occasionally give a descendant's spouse their own recorded parents
 * (growInLawAncestors) — direction:"up" in generateRandomFamily. Smaller
 * SEED_COUNT/SIZES than the descendant-only block above: ancestor generation
 * is heavier per seed (recursion in two directions, not just down), and the
 * descendant-only block already covers the down-only shapes exhaustively —
 * this block's job is specifically to catch anything the ancestor code path
 * gets wrong, not to re-prove what the first block already proves.
 *
 * All four invariants (overlaps, interleaved-siblings, side-constraint,
 * determinism) are hard per-seed assertions — Stage 3 shipped with a KNOWN
 * GAP here (two mutually-unrelated same-branch clusters landing on the same
 * row with no row-level coordination between them, occasionally producing an
 * interleaved-sibling or side-constraint violation — see subtree.ts's
 * growSiblingRow/placeAncestorUnit doc comments for the root-caused
 * mechanism) tracked via an aggregate rate bound instead of a hard
 * assertion. Stage 4 (elastic Y) closed that gap:
 * repairSideConstraintViolations (subtree.ts) is a bounded, local,
 * post-placement Y-nudge repair pass that resolves BOTH violation kinds by
 * moving the offending cluster's whole already-placed subtree to a
 * genuinely free row — see its own doc comment for why an X-only fix (tried
 * and reverted during Stage 3) couldn't work here. Measured at 0/50 for both
 * violation kinds across every UP_SIZES bucket before tightening this back
 * to hard assertions.
 */
describe("layout engine — property-based invariants (random graphs with ancestors + in-laws)", () => {
  const UP_SEED_COUNT = 150;
  const UP_SIZES = [5, 15, 35];

  for (const personCount of UP_SIZES) {
    describe(`personCount=${personCount}`, () => {
      for (let seed = 0; seed < UP_SEED_COUNT / UP_SIZES.length; seed++) {
        it(`seed=${seed}: no overlaps, no interleaved siblings, no side-constraint violations, deterministic`, () => {
          const { graph, focusPersonId } = generateRandomFamily({
            seed: seed * 1000 + personCount,
            personCount,
            direction: "up",
          });

          const result = buildTreeLayout(graph, focusPersonId);

          const overlaps = detectOverlaps(positionMap(result));
          expect(
            overlaps,
            `card overlaps at seed=${seed} personCount=${personCount}: ${JSON.stringify(overlaps)}`,
          ).toEqual([]);

          expect(
            findInterleavedSiblingViolation(result),
            `sibling interleaving at seed=${seed} personCount=${personCount}`,
          ).toBeNull();

          expect(
            findSideConstraintViolation(result),
            `side-constraint violation at seed=${seed} personCount=${personCount}`,
          ).toBeNull();

          // Determinism: same as the descendant-only block above.
          const result2 = buildTreeLayout(graph, focusPersonId);
          expect(positionMap(result2)).toEqual(positionMap(result));
        });
      }
    });
  }
});
