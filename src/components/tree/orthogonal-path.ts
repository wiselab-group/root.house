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

/**
 * Drops any interior point that isn't a REAL turn — i.e. sits exactly on
 * the straight line between its neighbors (prev/corner/next share an x, or
 * share a y). A vertically-centered child (sourceX === targetX, e.g. a
 * middle sibling directly under the parent trunk's own x — no leftward or
 * rightward jog needed) still gets a caller-built four-point "down, across,
 * down" polyline whose middle segment collapses to zero length; feeding
 * that straight into the rounding loop below inserts two pointless
 * quadratic curves into what is, visually, one plain vertical line — the
 * user caught this as a stray "hook" partway down an otherwise-straight
 * connector. Collinear points carry no geometry the rounding needs, so
 * removing them first is exact, not an approximation.
 */
function dropNonTurningPoints(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const result: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const corner = points[i];
    const next = points[i + 1];
    const collinear =
      (prev.x === corner.x && corner.x === next.x) ||
      (prev.y === corner.y && corner.y === next.y);
    if (!collinear) result.push(corner);
  }
  result.push(points[points.length - 1]);
  return result;
}

/**
 * @param sharpAt Corners to render as a plain sharp 90° angle instead of a
 * rounded one — matched by coordinates, not index (dropNonTurningPoints can
 * shift indices, and the caller only knows this geometrically: "the bend at
 * (targetX, midY)", not "point 1"). Used for a middle sibling's own turn
 * down into its card (see UnionChildEdgeData.isMiddleSibling) — that turn is
 * a sideways jog flanked by other similarly-jogging siblings' lines, and
 * rounding it reads as an ugly zigzag knot; a sharp angle there reads as a
 * clean line instead.
 */
export function roundedOrthogonalPath(
  rawPoints: Point[],
  sharpAt: Point[] = [],
): string {
  const points = dropNonTurningPoints(rawPoints);
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];

    if (sharpAt.some((p) => p.x === corner.x && p.y === corner.y)) {
      d += ` L${corner.x},${corner.y}`;
      continue;
    }

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
