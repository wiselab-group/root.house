import type { NormalizedGraph, Point } from "./types";
import { CARD_HEIGHT, CARD_WIDTH } from "./subtree";

export interface Overlap {
  a: string;
  b: string;
  overlapX: number;
  overlapY: number;
}

/**
 * detectOverlaps — geometric post-hoc check: two Person cards must never
 * occupy overlapping space. This is a VALIDATION pass, not the primary
 * placement mechanism (§17 — collision avoidance happens before placement,
 * via occupancy.ts; this function exists to catch bugs, not to fix them).
 */
export function detectOverlaps(
  positionByPerson: Map<string, Point>,
): Overlap[] {
  const entries = [...positionByPerson.entries()];
  const overlaps: Overlap[] = [];

  // Y-bucket for performance on larger trees.
  const buckets = new Map<number, string[]>();
  const bucketHeight = CARD_HEIGHT;
  for (const [id, pos] of entries) {
    const key = Math.floor(pos.y / bucketHeight);
    for (const k of [key - 1, key, key + 1]) {
      const arr = buckets.get(k);
      if (arr) arr.push(id);
      else buckets.set(k, [id]);
    }
  }

  const checked = new Set<string>();
  for (const [key, ids] of buckets) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i];
        const idB = ids[j];
        const pairKey =
          idA < idB ? `${idA}|${idB}|${key}` : `${idB}|${idA}|${key}`;
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        const posA = positionByPerson.get(idA)!;
        const posB = positionByPerson.get(idB)!;
        const overlapX = CARD_WIDTH - Math.abs(posA.x - posB.x);
        const overlapY = CARD_HEIGHT - Math.abs(posA.y - posB.y);
        if (overlapX > 0 && overlapY > 0) {
          overlaps.push({ a: idA, b: idB, overlapX, overlapY });
        }
      }
    }
  }
  return overlaps;
}

/**
 * assertNoOverlaps — hard invariant enforced at the end of every layout run
 * (called from layout.ts) and re-asserted directly in every geometric test.
 * Throws with enough detail to debug which two people collided.
 */
export function assertNoOverlaps(positionByPerson: Map<string, Point>): void {
  const overlaps = detectOverlaps(positionByPerson);
  if (overlaps.length === 0) return;
  const details = overlaps
    .map(
      (o) =>
        `${o.a} × ${o.b} (overlapX=${o.overlapX.toFixed(1)}, overlapY=${o.overlapY.toFixed(1)})`,
    )
    .join("; ");
  throw new Error(
    `assertNoOverlaps: ${overlaps.length} card overlap(s) detected — ${details}`,
  );
}

/** Every canonical person must produce exactly one Person node (§9 mandatory invariant). */
export function assertOnePositionPerPerson(
  graph: NormalizedGraph,
  positionByPerson: Map<string, Point>,
): void {
  for (const id of graph.personById.keys()) {
    if (!positionByPerson.has(id)) {
      throw new Error(
        `assertOnePositionPerPerson: person "${id}" has no position`,
      );
    }
  }
  if (positionByPerson.size !== graph.personById.size) {
    throw new Error(
      `assertOnePositionPerPerson: positionByPerson has ${positionByPerson.size} entries but graph has ${graph.personById.size} persons`,
    );
  }
}
