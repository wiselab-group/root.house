/**
 * The gentle arc a move is drawn along on the family map — a quadratic
 * curve bowed to the right of the direction of travel, so a move and its
 * way back don't overlap. Computed in plain lng/lat: family moves are
 * regional, where the projection's distortion along a curve is invisible.
 */

export type LngLat = [number, number];

const SEGMENTS = 48;
const BOW = 0.18;

export function arcPoints(from: LngLat, to: LngLat): LngLat[] {
  const [ax, ay] = from;
  const [bx, by] = to;
  const cx = (ax + bx) / 2 - (by - ay) * BOW;
  const cy = (ay + by) / 2 + (bx - ax) * BOW;
  const points: LngLat[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const u = 1 - t;
    points.push([
      u * u * ax + 2 * u * t * cx + t * t * bx,
      u * u * ay + 2 * u * t * cy + t * t * by,
    ]);
  }
  return points;
}

/** The first `progress` (0..1) of an arc — a move drawing itself in. */
export function partialArc(
  points: readonly LngLat[],
  progress: number,
): LngLat[] {
  if (progress >= 1) return [...points];
  const reach = Math.max(0, progress) * (points.length - 1);
  const whole = Math.floor(reach);
  const head = points.slice(0, whole + 1);
  const next = points[whole + 1];
  if (next) {
    const f = reach - whole;
    const [px, py] = points[whole];
    head.push([px + (next[0] - px) * f, py + (next[1] - py) * f]);
  }
  return head;
}
