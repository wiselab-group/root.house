import type { Rect } from "./types";

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
}
