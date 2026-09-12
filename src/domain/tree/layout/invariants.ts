import type { TreeLayoutResult } from "./types";

/**
 * invariants.ts — shared geometric invariant checkers used by BOTH the
 * property-based random-graph tests (invariants.property.test.ts) and the
 * real-fixture regression gate (layout.test.ts's "real fixture — engine
 * invariants" block, rewrite plan §7 Stage 2). Kept as a normal (non-.test)
 * module so two separate test files can both import the same checking logic
 * instead of drifting copies — a bug in the checker itself should only ever
 * need fixing in one place.
 *
 * Not a "production" module in the sense of being reachable from app code —
 * it lives beside the engine because it inspects the engine's own output
 * shape (TreeLayoutResult) and constants, same as collision.ts.
 */

export function positionMap(result: TreeLayoutResult) {
  return new Map(result.persons.map((p) => [p.id, { x: p.x, y: p.y }]));
}

/**
 * "Paternal line strictly left, maternal line strictly right" (CLAUDE.md's
 * oldest tree-layout invariant) as a checkable geometric property, for the
 * ancestor side (rewrite plan §7 Stage 3): no person with branch==="paternal"
 * may sit to the right of ANY person with branch==="maternal" that shares
 * their exact generation (y) — the two lineages' rows must never overlap in
 * x once they share a row. Comparing WITHIN each shared row (not globally
 * across all rows) is deliberate: a deep paternal ancestor several
 * generations up can legitimately sit at a very different x than a shallow
 * maternal one a few rows down, without that meaning the lines "crossed" —
 * the invariant is about two lineages sharing space on the SAME row, not
 * about absolute x ever being smaller/larger.
 */
export function findSideConstraintViolation(
  result: TreeLayoutResult,
): string | null {
  const byY = new Map<number, typeof result.persons>();
  for (const p of result.persons) {
    if (!byY.has(p.y)) byY.set(p.y, []);
    byY.get(p.y)!.push(p);
  }
  for (const [y, row] of byY) {
    const paternal = row.filter((p) => p.branch === "paternal");
    const maternal = row.filter((p) => p.branch === "maternal");
    if (paternal.length === 0 || maternal.length === 0) continue;
    const paternalMaxX = Math.max(...paternal.map((p) => p.x));
    const maternalMinX = Math.min(...maternal.map((p) => p.x));
    if (paternalMaxX >= maternalMinX) {
      const offender = paternal.find((p) => p.x === paternalMaxX)!;
      const other = maternal.find((p) => p.x === maternalMinX)!;
      return `y=${y}: paternal person ${offender.id} (x=${offender.x}) is not strictly left of maternal person ${other.id} (x=${other.x})`;
    }
  }
  return null;
}

/**
 * "Full siblings adjacent" as a checkable geometric property: for every pair
 * of full siblings (same exact parentIds set) on the SAME resolved y, the
 * only thing allowed to sit between two of them is one sibling's OWN spouse
 * card (a married-in in-law legitimately occupies the space right next to
 * their partner, inside the sibling row — CLAUDE.md's own "spouses always
 * adjacent" rule) — never an unrelated third party's card.
 */
export function findInterleavedSiblingViolation(
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
    if (sameRow.length < 2) continue; // elastic Y (later stages) may split a row — not a Stage 1/2 concern
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
 * a parent-child trunk can produce (no ancestor-side lines yet in Stage
 * 1/2): for every partnership with 2+ children on the same row, the
 * children's x-order must match the graph's childrenIds order — trivially
 * true once growBranch places each child's full subtree as one contiguous
 * reserved block (see subtree.ts) but checked explicitly here as a
 * property, not assumed from the code.
 *
 * Only valid for a row with no independently-pinned anchor inside it (a
 * person whose position was already fixed by something other than this
 * row's own placement, e.g. the focus person, or — in the current hybrid
 * engine, before Stage 3 replaces placement.ts's row-based ancestor code —
 * many ancestor rows). The real fixture's Stage 2 gate (layout.test.ts)
 * therefore only applies this to the one partnership it can confirm has no
 * such anchor (Eva's), rather than calling this against the whole fixture.
 */
export function findCrossedTrunkViolation(
  result: TreeLayoutResult,
): string | null {
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
    const byChildrenIdsOrder = partnershipChildrenOrder(partnershipId, result);
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
