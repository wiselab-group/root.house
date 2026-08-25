/**
 * Builds an SVG path through a sequence of axis-aligned points (each
 * consecutive pair sharing either an x or a y), rounding every interior
 * corner with a small quadratic curve instead of a sharp 90° turn. Used by
 * every parent_child-style edge (RelationshipEdge, UnionChildEdge) so
 * they all read as one consistent "family tree" line style, matching the
 * original getSmoothStepPath(borderRadius) look this replaced — see
 * relationship-edge.tsx for why a hand-built path is needed at all
 * (getSmoothStepPath's own rounding breaks down on the near-zero-length
 * segments a union trunk's start point can produce).
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

    // Radius can't exceed half of either adjacent segment's length, or the
    // curve would overshoot past the corner (or past the previous one on a
    // very short segment) — clamp to what actually fits.
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

/** The point `distance` units from `from`, along the line toward `to`. */
function pointToward(from: Point, to: Point, distance: number): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0) return from;
  const t = distance / length;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}
