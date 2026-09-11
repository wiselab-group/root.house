import type { Point, Rect } from "./types";

/**
 * OccupancyModel — the spatial index the layout engine consults BEFORE
 * placing a branch (§31 spatial occupancy model). Implemented as Y-bucketed
 * rectangles: cheap to query ("is [x1,x2] free in row y?"), cheap to
 * reserve, and easy to reason about/test. A branch never gets placed and
 * then checked — its full bounding rect is checked against this model
 * first, and only reserved once a valid candidate is chosen (§14/§17).
 *
 * Each reserved rectangle keeps its OWN full Y range, not just the bucket
 * it's filed under — the bucket is purely an index to avoid scanning every
 * reservation on every query. Two rectangles that happen to fall in the
 * same bucket but don't actually overlap in Y (e.g. a parent generation row
 * and the next generation row, sharing a bucket at their shared boundary)
 * must NOT be reported as colliding — that was a real bug: parents and
 * children ended up off-center because a same-bucket, different-Y sibling
 * row falsely registered as occupying the parent's X range.
 */
export interface Reservation {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const ROW_HEIGHT = 20; // bucket granularity for the Y axis — an indexing aid only, not a collision boundary

export class OccupancyModel {
  private rows = new Map<number, Reservation[]>();

  private rowKeysFor(minY: number, maxY: number): number[] {
    const startRow = Math.floor(minY / ROW_HEIGHT);
    const endRow = Math.floor(maxY / ROW_HEIGHT);
    const keys: number[] = [];
    for (let r = startRow; r <= endRow; r++) keys.push(r);
    return keys;
  }

  /** True if the rect overlaps any already-reserved space, given a required gap on all sides. */
  intersects(rect: Rect, gap: number): boolean {
    const minX = rect.x - rect.width / 2 - gap;
    const maxX = rect.x + rect.width / 2 + gap;
    const minY = rect.y - rect.height / 2 - gap;
    const maxY = rect.y + rect.height / 2 + gap;

    const seen = new Set<Reservation>();
    for (const key of this.rowKeysFor(minY, maxY)) {
      const reservations = this.rows.get(key);
      if (!reservations) continue;
      for (const res of reservations) {
        if (seen.has(res)) continue; // a reservation can span multiple buckets — check each once
        seen.add(res);
        const overlapsX = minX < res.maxX && maxX > res.minX;
        const overlapsY = minY < res.maxY && maxY > res.minY;
        if (overlapsX && overlapsY) return true;
      }
    }
    return false;
  }

  /** Reserves the rect's footprint so later branches see this space as occupied. */
  reserve(rect: Rect): void {
    const minX = rect.x - rect.width / 2;
    const maxX = rect.x + rect.width / 2;
    const minY = rect.y - rect.height / 2;
    const maxY = rect.y + rect.height / 2;
    const reservation: Reservation = { minX, maxX, minY, maxY };

    for (const key of this.rowKeysFor(minY, maxY)) {
      const reservations = this.rows.get(key);
      if (reservations) reservations.push(reservation);
      else this.rows.set(key, [reservation]);
    }
  }

  /**
   * Removes the exact reservation previously made with `reserve(rect)` (same
   * x/y/width/height) — used by post-placement repair passes that need to
   * re-search for a BETTER slot for something already placed (e.g.
   * tryMoveChildNearParent, subtree.ts) without that thing's own old
   * reservation blocking the very search meant to relocate it. A no-op if no
   * matching reservation exists (defensive — never throws on a stale rect).
   */
  release(rect: Rect): void {
    const minX = rect.x - rect.width / 2;
    const maxX = rect.x + rect.width / 2;
    const minY = rect.y - rect.height / 2;
    const maxY = rect.y + rect.height / 2;

    for (const key of this.rowKeysFor(minY, maxY)) {
      const reservations = this.rows.get(key);
      if (!reservations) continue;
      const index = reservations.findIndex(
        (r) =>
          r.minX === minX &&
          r.maxX === maxX &&
          r.minY === minY &&
          r.maxY === maxY,
      );
      if (index !== -1) reservations.splice(index, 1);
    }
  }

  /**
   * Returns the free interval [x1, x2] closest to preferredX in the given Y
   * row, or null if the whole search range is blocked. When `bias` is -1 or
   * +1, the search only extends in that direction (never crosses back past
   * preferredX to the other side) — used for paternal/maternal ancestor
   * placement, where wandering to the wrong side is a semantic bug, not
   * just a cosmetic one, even if that side happens to be free first.
   */
  findFreeInterval(
    y: number,
    height: number,
    width: number,
    gap: number,
    preferredX: number,
    searchRadius: number,
    bias: -1 | 0 | 1 = 0,
  ): number | null {
    const step = Math.max(8, Math.round(width / 4));
    for (let offset = 0; offset <= searchRadius; offset += step) {
      const candidates =
        offset === 0
          ? [preferredX]
          : bias === 0
            ? [preferredX + offset, preferredX - offset]
            : [preferredX + bias * offset];
      for (const candidateX of candidates) {
        const rect: Rect = { x: candidateX, y, width, height };
        if (!this.intersects(rect, gap)) return candidateX;
      }
    }
    return null;
  }

  /**
   * Elastic-Y search (rewrite plan §7 Stage 4): tries `findFreeInterval` at
   * `preferredY` first (identical to today's rigid-row behavior — the common
   * case never pays for a Y search it doesn't need), and only if THAT whole
   * X search radius is exhausted (or every candidate it finds fails the
   * optional `validate` check, see below) does it retry the SAME X search at
   * `preferredY` nudged up/down by `yStep`, growing the nudge outward
   * (`yStep`, `2*yStep`, ...) until `maxYNudge` is reached.
   *
   * This is what replaces `raiseAncestryOneGeneration` (graph.ts, deleted —
   * see git history) and the old `findStrandedOnlyChildren` retry pass
   * (placement.ts, deleted in Stage 3): instead of detecting a stranded
   * branch AFTER the fact and re-running placement on a mutated `generation`
   * field for the WHOLE ancestor chain, a branch that can't find room on its
   * natural row now tries a small Y offset AS PART OF ITS OWN placement
   * search — bounded, local, and no second full placement pass.
   *
   * `validate` (optional): a caller-supplied predicate over a candidate
   * `{x, y}`, checked in addition to plain occupancy-freedom. Needed for a
   * class of conflict occupancy alone can't see: two mutually unrelated
   * same-branch clusters (see placeAncestorUnit's own doc comment) can each
   * compute an `idealX` that is individually occupancy-free — neither one's
   * search ever intersects the other's reserved rectangles — yet still land
   * in the WRONG RELATIVE ORDER on the shared row (paternal ending up right
   * of maternal, or a foreign cluster's card ending up between two blood
   * siblings), because occupancy-freedom only rules out overlapping space,
   * never "which side" two non-overlapping reservations end up on. Plain
   * `findFreeInterval`/the no-`validate` path above literally cannot detect
   * this — there is nothing to search past. `validate` lets the caller
   * reject an otherwise-free candidate for this reason, so the search moves
   * on (more X offset, then Y nudge) to a candidate that satisfies BOTH.
   *
   * Returns null if the whole nudge range is exhausted too — same "caller
   * falls back to a forced placement, assertNoOverlaps is the final
   * backstop" contract as findFreeInterval.
   */
  findFreeSlot(
    preferredY: number,
    height: number,
    width: number,
    gap: number,
    preferredX: number,
    searchRadius: number,
    bias: -1 | 0 | 1,
    yStep: number,
    maxYNudge: number,
    validate?: (candidate: Point) => boolean,
  ): Point | null {
    const atPreferredY = this.findFreeIntervalValidated(
      preferredY,
      height,
      width,
      gap,
      preferredX,
      searchRadius,
      bias,
      validate,
    );
    if (atPreferredY !== null) return { x: atPreferredY, y: preferredY };

    for (let yOffset = yStep; yOffset <= maxYNudge; yOffset += yStep) {
      for (const candidateY of [preferredY + yOffset, preferredY - yOffset]) {
        const x = this.findFreeIntervalValidated(
          candidateY,
          height,
          width,
          gap,
          preferredX,
          searchRadius,
          bias,
          validate,
        );
        if (x !== null) return { x, y: candidateY };
      }
    }
    return null;
  }

  /**
   * The largest maxY across every reservation made so far, or null if
   * nothing has been reserved yet — used by placeIsolatedPersons (subtree.ts)
   * to anchor the isolated-persons row strictly below the entire already-
   * placed graph, without assuming any relationship between Y and
   * generation numbers (elastic-Y repairs can move a card off its nominal
   * generation row — see MAX_Y_NUDGE's own doc comment).
   */
  maxReservedY(): number | null {
    let max: number | null = null;
    for (const reservations of this.rows.values()) {
      for (const res of reservations) {
        if (max === null || res.maxY > max) max = res.maxY;
      }
    }
    return max;
  }

  /** findFreeInterval, but each occupancy-free candidate is also run through `validate` (if given) before being accepted — see findFreeSlot's own doc comment for why this is needed. */
  private findFreeIntervalValidated(
    y: number,
    height: number,
    width: number,
    gap: number,
    preferredX: number,
    searchRadius: number,
    bias: -1 | 0 | 1,
    validate?: (candidate: Point) => boolean,
  ): number | null {
    if (!validate) {
      return this.findFreeInterval(
        y,
        height,
        width,
        gap,
        preferredX,
        searchRadius,
        bias,
      );
    }
    const step = Math.max(8, Math.round(width / 4));
    for (let offset = 0; offset <= searchRadius; offset += step) {
      const candidates =
        offset === 0
          ? [preferredX]
          : bias === 0
            ? [preferredX + offset, preferredX - offset]
            : [preferredX + bias * offset];
      for (const candidateX of candidates) {
        const rect: Rect = { x: candidateX, y, width, height };
        if (this.intersects(rect, gap)) continue;
        if (!validate({ x: candidateX, y })) continue;
        return candidateX;
      }
    }
    return null;
  }
}
