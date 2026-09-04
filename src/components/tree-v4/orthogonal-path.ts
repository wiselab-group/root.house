/**
 * tree-v4 — builds an SVG path through a sequence of axis-aligned points
 * (each adjacent pair shares either x or y), rounding every interior corner
 * with a small quadratic curve instead of a sharp 90° turn. Independent
 * implementation (not imported from tree-v2/tree-v3) — same visual language
 * (rounded orthogonal trunk lines) by deliberate choice, not by reuse, per
 * the brief's "keep tree-v4 visually consistent with the existing project."
 */
export interface Point {
  x: number;
  y: number;
}

const CORNER_RADIUS = 8;

export function roundedOrthogonalPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];

    // Radius can't exceed half the length of either adjacent segment, or
    // the curve would overshoot past the corner (or past a very short
    // neighboring segment) — clamp to what actually fits.
    const inLength = Math.hypot(corner.x - prev.x, corner.y - prev.y);
    const outLength = Math.hypot(next.x - corner.x, next.y - corner.y);
    const radius = Math.min(CORNER_RADIUS, inLength / 2, outLength / 2);

    const inStart = pointToward(corner, prev, radius);
    const outEnd = pointToward(corner, next, radius);

    d += ` L${inStart.x},${inStart.y} Q${corner.x},${corner.y} ${outEnd.x},${outEnd.y}`;
  }

  const last = points[points.length - 1];
  d += ` L${last.x},${last.y}`;
  return d;
}

/** Point `distance` away from `from`, heading toward `to`. */
function pointToward(from: Point, to: Point, distance: number): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0) return from;
  const t = distance / length;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}
