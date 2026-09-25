"use client";

import { BaseEdge, type EdgeProps } from "@xyflow/react";
import {
  AVATAR_RADIUS,
  CONNECTOR_CENTER_Y,
  type RelationshipFlowEdge,
  type RelationshipEdgeData,
} from "./adapters/xyflow-adapter";
import { cn } from "@/lib/utils";
import { roundedOrthogonalPath } from "./orthogonal-path";
import { useTreeNodeGeometry } from "./tree-layout-positions-context";
import { useJustExpandedEdge } from "./tree-just-expanded-edges-context";
import { UnionCollapseBadge } from "./union-collapse-badge";

/**
 * Relationship Trace's line color — terracotta (--primary), matching traced
 * cards' own border (see person-node-parts.tsx's buildCardFrameClassName —
 * isTraced uses --primary). Terracotta is the tree's default per-card
 * identity color now, so a traced card reads as an emphasized double-ring
 * version of the same hue everyone already has — the one exception is
 * whichever card currently has its own click-popover open, which switches
 * to sage (--tree-accent) instead, the one color reserved for "the person
 * you're looking at right now" (see person-node.tsx's isPopoverOpen). Also
 * keeps the traced path visually distinct from --branch, the warm brown
 * used for every other (non-traced) tree line.
 */
export const TRACE_COLOR = "var(--primary)";

/**
 * How far above a compact-style child's own card top edge the connector's
 * horizontal bend sits (see ParentChildEdgeLine) — a fixed pixel length, not
 * a proportional split of the parent/child gap: that gap is only ~30px
 * (COMPACT_Y_SPACING minus card height), so a proportional split barely
 * moves the bend at all. A fixed tail reads as a clear, deliberate line
 * into the avatar regardless of how tall the gap happens to be.
 */
export const COMPACT_CHILD_TAIL_LENGTH = 56;

/**
 * Which marching-ants className (globals.css) crawls the dashes in the
 * A→B-visible direction along THIS path, given which way this specific
 * path's `d` was drawn relative to the A→B walk (see traceDirection's own
 * doc comment on RelationshipEdgeData). Centralized so every call site
 * picks between the two classes the same way.
 *
 * The mapping is inverted relative to what the class names suggest: SVG's
 * stroke-dashoffset moving toward a MORE POSITIVE value (globals.css's own
 * "-march-forward" keyframe, `to { stroke-dashoffset: 20 }`) visually slides
 * the dash pattern BACKWARD along the path — from its end toward its start
 * — not forward from start to end (a negative-going offset does that,
 * "-march-reverse"'s `to { stroke-dashoffset: -20 }`). So when this path's
 * own `d` was drawn source→target in the same order as the A→B walk
 * (traceDirection 1), the class that visually crawls start-to-end — i.e.
 * A-to-B, the direction the user actually asked to see — is "-reverse", not
 * "-forward". Real bug the user caught (Relationship Trace between two
 * ancestor/descendant people): the dashes were visibly crawling B→A while
 * every doc comment and variable name said A→B.
 */
export function traceMarchClassName(traceDirection: 1 | -1): string {
  return traceDirection === 1
    ? "animate-tree-trace-march-reverse"
    : "animate-tree-trace-march-forward";
}

/**
 * Draws a traced (terracotta, marching-ants) line with a solid, undashed
 * backdrop painted first, in the canvas background color — a general fix
 * for a whole class of bug, not a one-off: ANY two tree lines that happen
 * to run along the exact same pixels (a union trunk's shared stem before a
 * sibling branches off, a partnership line's plain half meeting the traced
 * half, or any future case neither of us has hit yet) would otherwise show
 * the plain one bleeding through the terracotta dash's gaps, no matter how
 * carefully the plain line's own geometry is trimmed to avoid the overlap
 * (see git history — that per-case trimming approach was tried first, in
 * union-child-edge.tsx, and still needed a second bug-fixed revision once a
 * same-row assumption turned out false on real data). A solid backdrop
 * drawn BEFORE the traced line in paint order hides whatever's underneath
 * unconditionally — the fix no longer depends on finding and trimming every
 * overlapping line's geometry by hand.
 *
 * The backdrop is noticeably wider than the traced stroke itself
 * (strokeWidth + 6, not just +2) with `strokeLinejoin="round"` — a plain
 * neighboring line's own T-junction into this same path routinely lands a
 * few px off from this path's own rounded corner (roundedOrthogonalPath's
 * CORNER_RADIUS curve, orthogonal-path.ts, is computed independently per
 * edge — two edges meeting near the same point don't share one exact
 * corner), so a backdrop only as wide as the stroke left a thin sliver of
 * that neighboring line visible right at the bend (real bug caught on real
 * data, screenshot arrow pointing at exactly that sliver). `--tree-canvas`
 * (not the app-wide `--background`) is used because the tree canvas's own
 * background is a separate, warmer token (see globals.css, split off
 * 2026-09-18) — painting this backdrop in plain `--background` left a
 * visibly mismatched pale strip against the actual (warmer) canvas color, a
 * real bug the user caught on real data (Елена/Николай Купчик's partnership
 * line, same real couple this file's other occluder bug below was also
 * caught on).
 */
export function TracedLine({
  path,
  traceDirection,
  strokeWidth,
}: {
  path: string;
  traceDirection: 1 | -1;
  strokeWidth: number;
}) {
  return (
    <>
      <path
        d={path}
        fill="none"
        stroke="var(--tree-canvas)"
        strokeWidth={strokeWidth + 6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <BaseEdge
        path={path}
        className={traceMarchClassName(traceDirection)}
        style={{ strokeWidth, stroke: TRACE_COLOR }}
      />
    </>
  );
}

/**
 * One diagonal stroke of the standard genogram "divorced" mark (McGoldrick/
 * Gerson notation) — see DivorceBreakMark's own doc comment for the full
 * two-stroke `//` shape this composes. Symmetric around (x, y) on BOTH axes
 * (x∓2.5, not the earlier x-3/x+2) — DivorceGapOccluder centers its own
 * occlusion segment exactly on this same (x, y), so an asymmetric stroke
 * left a ~0.5px sliver of solid line uncovered on one side and
 * over-occluded on the other (real bug the user caught: the line visibly
 * poked past the slash on one side but not the other, inconsistently
 * between different divorced couples depending on which side of the couple
 * happened to render first).
 */
function DivorceSlash({ x, y }: { x: number; y: number }) {
  return (
    <line
      x1={x - 2.5}
      y1={y - 7}
      x2={x + 2.5}
      y2={y + 7}
      stroke="var(--branch)"
      strokeWidth={2}
      strokeLinecap="round"
    />
  );
}

/**
 * The standard genogram "divorced" mark (McGoldrick/Gerson notation) — two
 * short parallel diagonal strokes crossing the partnership line, like a `//`
 * cutting the line, with the line itself visibly broken between them.
 * Replaces an earlier dasharray-based scheme (current marriage "5 3" vs past
 * "2 4") that user testing showed was too subtle to read as two different
 * states at a glance — both looked like "some dashed line". A solid line
 * with an explicit break is the widely recognized convention instead, and
 * reads clearly at any zoom level since it's a shape, not a spacing
 * difference. Each stroke is drawn at a fixed screen-space angle/length
 * regardless of the partnership line's own (near-horizontal) direction —
 * real genograms draw this mark at a consistent diagonal, not perpendicular
 * to the line, so it stays instantly recognizable rather than blending into
 * the line itself.
 *
 * The gap around each stroke is NOT cut out of the underlying `path`'s `d`
 * (two `M...L...` subpaths with the middle segment omitted) — that was tried
 * and explicitly reverted per user feedback ("ты опять сломал!"): it reads
 * as a rendering glitch rather than a deliberate mark, especially at the
 * corner joins other lines (union trunk, collapse badge) make with this
 * exact path. Instead the underlying line is drawn as one unbroken `path`,
 * exactly as before, and the gap is painted on top of it afterward — a
 * `--background`-colored occluding segment centered on EACH stroke's own
 * position, the same backdrop-occlusion trick TracedLine already uses
 * elsewhere in this file to hide whatever line is underneath without
 * touching that line's own geometry. One occluder per stroke (not one
 * spanning the full distance between them) because in the `straddle` case
 * the two strokes sit ~20-28px apart straddling the collapse badge — a
 * single occluder centered on the untouched (x, y) midpoint would only
 * cover the badge's own already-covered anchor point, not either actual
 * stroke (this was the bug: gap looked like it did nothing, because it was
 * painted somewhere the line-over-it problem wasn't). `gapAxis` gives each
 * occluder the line's local direction (it must be a short segment ALONG the
 * partnership line, not a fixed-orientation shape) so it fully covers the
 * line without also erasing the canvas's dotted Background pattern in a
 * shape that doesn't match the line.
 *
 * Normally both strokes (and the gap between them) sit at the line's own
 * midpoint (`straddle` undefined) — but that midpoint is also where
 * UnionCollapseBadge anchors (see PartnershipEdgeLine's midX/midY, both
 * exist for the same reason). Real bug caught on real data: a divorced
 * couple with a shared child showed a solid, unbroken line — the badge's
 * opaque HTML button (EdgeLabelRenderer, painted above the SVG edge layer)
 * fully covered a `//` drawn at that same spot, badge and mark piled on one
 * point. Fixed by splitting the two strokes apart instead of moving either
 * element off its own anchor: pass `straddle` (the direction from the
 * midpoint toward the OTHER end of whichever segment is actually drawn at
 * the call site) to draw one stroke just before the badge and the other
 * just after it, each clear of the badge's ~20px footprint
 * (CollapseToggleButton's h-5/min-w-5) — reading as one `//` mark that the
 * badge happens to sit inside, not a mark shoved off to one side. The
 * offset (20px) sits right at the button's own edge — a wider 28px, tried
 * briefly, put visible clearance between the badge and each stroke that the
 * user asked to have removed again ("верни слеши ближе").
 *
 * The gap occluder is drawn even when a collapse badge also sits between
 * the strokes: the badge (CollapseToggleButton, a small round button) isn't
 * guaranteed to fully cover the strokes' span on its own — real bug caught
 * on real data, a divorced couple WITH a collapse badge still showed a
 * solid line between the strokes, the button's own opaque circle narrower
 * than the gap the strokes imply. Drawing the occluder underneath the badge
 * unconditionally is harmless (both are the same background color) and
 * removes the dependency on the badge's exact size/shape.
 */
function DivorceBreakMark({
  x,
  y,
  straddle,
  towardOnly,
  gapAxis,
}: {
  x: number;
  y: number;
  straddle?: { dx: number; dy: number };
  /**
   * When only one side of the midpoint actually has a drawn line (the
   * traced-partial-line branch in PartnershipEdgeLine — the other half is
   * drawn by UnionChildEdge instead, see its own comment there), both
   * strokes must sit on THAT side of the badge, not straddle it — a stroke
   * placed on the undrawn side would float in empty space next to nothing.
   */
  towardOnly?: boolean;
  /**
   * Unit-ish direction vector of the underlying line at this point, used to
   * orient the gap occluder along it (see this function's own doc comment).
   */
  gapAxis?: { dx: number; dy: number };
}) {
  if (!straddle) {
    // Spans the full distance between both strokes (x-4 to x+4, i.e.
    // halfSpan 4 + each DivorceSlash's own ~2.5px half-width so the
    // occluder's edge reaches under the stroke rather than stopping just
    // short of it) — a single occluder only as wide as one stroke's own
    // footprint (this function's earlier version) left a bare sliver of
    // solid line visible between it and the OTHER stroke, since the two
    // strokes here sit apart from each other, not both on the same spot as
    // the (x, y) center. Real bug the user caught on real data (Нина/Сергей
    // Тихонович, no collapse badge): the line visibly poked out past one of
    // the two slashes.
    const gap = gapAxis ? (
      <DivorceGapOccluder x={x} y={y} axis={gapAxis} halfSpan={4} />
    ) : null;
    return (
      <>
        {gap}
        <DivorceSlash x={x - 4} y={y} />
        <DivorceSlash x={x + 4} y={y} />
      </>
    );
  }
  const length = Math.hypot(straddle.dx, straddle.dy) || 1;
  const offset = 20;
  const ux = (straddle.dx / length) * offset;
  const uy = (straddle.dy / length) * offset;
  // The strokes sit straddling the badge (offset from x/y by ~20px, see
  // above) — the occluder must be centered on EACH stroke's own position,
  // not on the original (x, y) midpoint, which here is the badge's own
  // anchor, not a point between the strokes. Two separate occluders, one
  // per stroke, rather than one spanning both: the badge itself already
  // covers the space between them.
  if (towardOnly) {
    const strokeAX = x + ux * 0.5;
    const strokeAY = y + uy * 0.5;
    const strokeBX = x + ux * 1.4;
    const strokeBY = y + uy * 1.4;
    return (
      <>
        {gapAxis && (
          <DivorceGapOccluder x={strokeAX} y={strokeAY} axis={gapAxis} />
        )}
        {gapAxis && (
          <DivorceGapOccluder x={strokeBX} y={strokeBY} axis={gapAxis} />
        )}
        <DivorceSlash x={strokeAX} y={strokeAY} />
        <DivorceSlash x={strokeBX} y={strokeBY} />
      </>
    );
  }
  const strokeAX = x - ux;
  const strokeAY = y - uy;
  const strokeBX = x + ux;
  const strokeBY = y + uy;
  // ONE occluder per side, spanning the ENTIRE stretch from the stroke's OWN
  // outer edge (away from the badge, toward the person's card — NOT past
  // it, see below) all the way in to the badge's own anchor (x, y) — not a
  // stroke-sized occluder plus a separately-sized fill occluder stitched
  // together at an exact seam. Multiple exactly-abutting segments (tried
  // repeatedly before this) are extremely sensitive to sub-pixel rounding
  // in SVG rendering: each retuning of one segment's size shifted the OTHER
  // segment's edge relative to it, and real screenshots kept showing a
  // hairline of the connector line surviving right at whichever seam wasn't
  // just adjusted (real bugs the user caught repeatedly on real data,
  // Елена/Николай Купчик, even after confirming via exact SVG coordinates
  // that each individual segment's own span was numerically correct — the
  // seams between segments were the actual problem, not any single
  // segment's math). A single occluder per side removes every internal
  // seam.
  //
  // The occluder's outer edge lands at the stroke's own CENTER (strokeAX/
  // strokeBX), not at the outer edge of its full ~2.5px footprint. A genogram
  // `//` mark reads as the line being cut BY the diagonal stroke — the
  // stroke should visibly cross the connector line, half of it sitting on
  // the "line visible" side and half on the "occluded" side, not sit
  // entirely inside a white gap with the line stopping short of it on both
  // ends. Ending the occluder at the stroke's outer edge (tried first,
  // matching the stroke's full footprint) technically matched the stroke's
  // own bounding box exactly, but visually still read as the line stopping
  // short of the slash rather than touching it — the diagonal shape itself,
  // being much narrower than its own bounding box at any single point along
  // the (horizontal) partnership line, doesn't fill that box, so the box's
  // edge doesn't look like "where the stroke is" (real bug the user caught
  // on real, zoomed-in data: the stroke floated fully surrounded by white,
  // touching the line on neither side).
  const outerScale = 1;
  return (
    <>
      {gapAxis && (
        <>
          <DivorceGapOccluder
            x={x - ux * outerScale}
            y={y - uy * outerScale}
            axis={gapAxis}
            spanFrom={{ x, y }}
          />
          <DivorceGapOccluder
            x={x + ux * outerScale}
            y={y + uy * outerScale}
            axis={gapAxis}
            spanFrom={{ x, y }}
          />
        </>
      )}
      <DivorceSlash x={strokeAX} y={strokeAY} />
      <DivorceSlash x={strokeBX} y={strokeBY} />
    </>
  );
}

/**
 * Paints over the underlying partnership line, in the canvas background
 * color, along a short segment centered on (x, y) — see DivorceBreakMark's
 * own doc comment for why this occludes rather than cuts the real path.
 * Default `halfSpan` (2.5) matches DivorceSlash's own horizontal
 * (along-the-line) footprint — its diagonal runs from x-3 to x+2, a ~2.5px
 * half-width around its own center — so the line breaks exactly where the
 * slash crosses it, and the line's visible end touches the slash rather
 * than stopping short of it with a visible gap before the mark starts (real
 * bug the user caught: an earlier wider halfSpan of 6 left the line clearly
 * not reaching the slash). Call sites that need to cover BOTH of two
 * strokes with one occluder centered between them (the `!straddle` case in
 * DivorceBreakMark, where the two strokes sit at x∓4 rather than both under
 * this same point) pass a wider explicit `halfSpan` instead — 2.5 alone
 * would leave a sliver of solid line between the occluder and the far
 * stroke (real bug the user caught: the line visibly poked out past one of
 * the two slashes), while the geometrically "exact" 6.5 (each stroke's own
 * half-width plus the 4px gap between their centers) overshot visibly past
 * both strokes in practice (real bug the user caught: the line stopped
 * clearly short of the slashes) — 4 is tuned from that visual feedback
 * rather than derived purely from the nominal stroke coordinates.
 *
 * Two ways to size the occluded segment: `halfSpan` for a short symmetric
 * segment centered on (x, y) (the no-badge case, and each individual
 * stroke's own footprint), or `spanFrom` to instead draw from (x, y) all
 * the way out to an explicit second point — used by the straddle/badge case
 * to cover an entire stroke-to-badge stretch with one occluder rather than
 * stitching two separately-sized ones together at a seam (see
 * DivorceBreakMark's own doc comment for why the seam approach kept
 * regressing on real data).
 */
function DivorceGapOccluder({
  x,
  y,
  axis,
  halfSpan = 2.5,
  spanFrom,
}: {
  x: number;
  y: number;
  axis: { dx: number; dy: number };
  halfSpan?: number;
  spanFrom?: { x: number; y: number };
}) {
  const length = Math.hypot(axis.dx, axis.dy) || 1;
  const ux = (axis.dx / length) * halfSpan;
  const uy = (axis.dy / length) * halfSpan;
  const [x1, y1, x2, y2] = spanFrom
    ? [x, y, spanFrom.x, spanFrom.y]
    : [x - ux, y - uy, x + ux, y + uy];
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      // --tree-canvas, not --background — this occluder must match the
      // tree canvas's own (warmer) color, split into its own token
      // 2026-09-18; painting it in the plain app-wide background left a
      // visible pale strip here (real bug the user caught on real data,
      // Елена/Николай Купчик, same couple as the strokeWidth bug below).
      stroke="var(--tree-canvas)"
      // Matches the underlying partnership line's own strokeWidth (1.5)
      // exactly (no extra overlap needed at this width), not a much thicker
      // 4 — a noticeably thicker occluder painted a visibly wider white band
      // than the thin line it's covering, reading as an oversized gap around
      // the slash rather than a clean break exactly the line's own width
      // (real bug the user caught on real data, Елена/Николай Купчик, via
      // exact SVG coordinates confirming the occluder's x-span already
      // matched the slash exactly — the mismatch was in strokeWidth, not
      // position).
      strokeWidth={1.5}
      strokeLinecap="butt"
    />
  );
}

/**
 * Renders parent_child edges as a solid line and partnership edges also as
 * solid — divorce is marked with DivorceBreakMark (see its own doc comment)
 * rather than a different line style, so "descent" vs "union" is read from
 * edge SHAPE (straight-down vs straight-across, see DESIGN.md) rather than
 * needing separate label text on every edge.
 *
 * `data.isOnTracePath` (set by tree-trace.ts via xyflow-adapter.ts) draws
 * the edge in the accent color at full weight, overriding the normal
 * partnership/parent-child styling — this is how Relationship Trace (plan
 * §17) highlights the connecting edges between Person A and Person B.
 */
export function RelationshipEdge({
  id,
  type,
  source,
  target,
  data,
}: EdgeProps<RelationshipFlowEdge>) {
  const isPartnership = type === "partnership";
  const isPastPartnership = isPartnership && data?.isCurrent === false;
  const isOnTracePath = data?.isOnTracePath === true;
  // isOnTracePath collapses false/undefined together, but they mean
  // different things: undefined is "no trace active at all" (every line
  // stays normal), false is "a trace IS active and this edge isn't part of
  // it" (see xyflow-adapter.ts — traceEdgeIds present, even empty, means a
  // trace is active). Only the latter should fade the line, mirroring
  // person-node.tsx's own isDimmed (isOnTracePath === false).
  const isDimmed = data?.isOnTracePath === false;
  // Defaults to 1 (forward) — only read once isOnTracePath is true, where
  // xyflow-adapter.ts always sets a real value (see traceDirection's own
  // doc comment), so this fallback never actually applies in practice.
  const traceDirection = data?.traceDirection ?? 1;

  // parent_child edges (including union-child trunk lines, see
  // union-child-edge.tsx) are built as an explicit "down, across, down"
  // polyline with hand-rounded corners (orthogonal-path.ts) instead of
  // XYFlow's getSmoothStepPath: that helper computes rounded corners from
  // the *distance* between its bend points, which comes out visibly curved
  // (not just rounded) for short/near-zero segments — a union trunk's start
  // point routinely produces exactly that case.
  if (!isPartnership) {
    return (
      <ParentChildEdgeLine
        id={id}
        source={source}
        target={target}
        isOnTracePath={isOnTracePath}
        isDimmed={isDimmed}
        traceDirection={traceDirection}
        isMiddleSibling={data?.isMiddleSibling === true}
        isCollapsing={data?.isCollapsing === true}
        isCollapseAnimationReversed={data?.isCollapseAnimationReversed === true}
      />
    );
  }

  return (
    <PartnershipEdgeLine
      id={id}
      source={source}
      target={target}
      isPastPartnership={isPastPartnership}
      isOnTracePath={isOnTracePath}
      isDimmed={isDimmed}
      traceDirection={traceDirection}
      tracedPartnerId={data?.tracedPartnerId}
      unionCollapse={data?.unionCollapse}
      isCollapsing={data?.isCollapsing === true}
    />
  );
}

function ParentChildEdgeLine({
  id,
  source,
  target,
  isOnTracePath,
  isDimmed,
  traceDirection,
  isMiddleSibling,
  isCollapsing,
  isCollapseAnimationReversed,
}: {
  id: string;
  source: string;
  target: string;
  isOnTracePath: boolean;
  isDimmed: boolean;
  traceDirection: 1 | -1;
  isMiddleSibling: boolean;
  isCollapsing: boolean;
  isCollapseAnimationReversed: boolean;
}) {
  const sourceNode = useTreeNodeGeometry(source);
  const targetNode = useTreeNodeGeometry(target);
  const { justExpanded, reversed: justExpandedReversed } =
    useJustExpandedEdge(id);
  if (!sourceNode || !targetNode) return null;

  // Read the parent's bottom edge from the committed layout position
  // (TreeLayoutPositionsContext — see its own doc comment for why this
  // replaced useInternalNode's live DOM-measured internals.positionAbsolute
  // + measured.height). Both x/y AND width/height come from that same
  // non-DOM-dependent source now — width/height are the static card
  // dimensions (xyflow-adapter.ts's NODE_DIMENSIONS), same numbers
  // useInternalNode's own `measured` fallback (`measured?.height ?? height`)
  // resolved to before a real DOM measurement existed, and — unlike
  // `measured` — never goes stale across a node unmounting/remounting under
  // onlyRenderVisibleElements (rewrite plan §7 Stage 6).
  const sourceBottomY = sourceNode.y + sourceNode.height;
  const sourceCenterX = sourceNode.x + sourceNode.width / 2;
  const targetTopY = targetNode.y;
  const targetCenterX = targetNode.x + targetNode.width / 2;

  // A fixed-length tail above the child's card rather than a plain midpoint
  // bend — see COMPACT_CHILD_TAIL_LENGTH.
  const midY = Math.max(sourceBottomY, targetTopY - COMPACT_CHILD_TAIL_LENGTH);
  // (targetX, midY) is this child's own turn down into its card — for a
  // middle sibling (flanked by others on both sides, see
  // xyflow-adapter.ts's isMiddleSibling) that turn is a sideways jog that
  // reads as an ugly zigzag when rounded, so it's drawn sharp instead. The
  // OTHER bend, (sourceX, midY), is the T-off-the-trunk point — already a
  // clean rounded corner regardless of sibling count, left untouched.
  const orderedPoints = [
    { x: sourceCenterX, y: sourceBottomY },
    { x: sourceCenterX, y: midY },
    { x: targetCenterX, y: midY },
    { x: targetCenterX, y: targetTopY },
  ];
  // Collapse/expand animation direction (prune-collapsed.ts's
  // isCollapseAnimationReversed / computeCollapseAnimationDirections — see
  // their own doc comments): both the exit sweep (collapsing) AND the
  // entrance sweep (justExpanded, symmetric — user-requested) must always
  // run toward/from wherever this branch attaches to the rest of the
  // visible tree, which for a spouse's own ancestor chain is the CHILD end
  // (source, here) rather than the recorded parent (target) — reversing the
  // point order flips which end the `stroke-dashoffset` sweep starts from
  // without changing the line's visible geometry at all (same path, just
  // walked the other way).
  const points =
    (isCollapsing && isCollapseAnimationReversed) ||
    (justExpanded && justExpandedReversed)
      ? [...orderedPoints].reverse()
      : orderedPoints;
  const path = roundedOrthogonalPath(
    points,
    isMiddleSibling ? [{ x: targetCenterX, y: midY }] : [],
  );
  // isOnTracePath draws via TracedLine — see its own doc comment for why
  // this is a solid backdrop + terracotta line rather than a plain
  // <BaseEdge>: it's what makes ANY other line sharing this exact path
  // (this component's own former overlap bugs, and any future one) get
  // fully occluded, not just this specific overlap this component happens
  // to know about.
  if (isOnTracePath) {
    return (
      <TracedLine path={path} traceDirection={traceDirection} strokeWidth={3} />
    );
  }
  return (
    <BaseEdge
      id={id}
      path={path}
      pathLength={justExpanded || isCollapsing ? 1 : undefined}
      className={cn(
        justExpanded && "animate-tree-edge-draw",
        isCollapsing && "animate-tree-edge-collapse",
      )}
      style={{
        strokeWidth: 1.5,
        stroke: "var(--branch)",
        opacity: isDimmed ? 0.35 : 1,
      }}
    />
  );
}

/**
 * Partners sit side by side at the same generation (see
 * tree-layout.builder.ts's orderByPartnership) — a straight horizontal line
 * reads as "these two are side by side". Left/right is resolved from
 * useInternalNode's *live* positions (not a fixed sourceHandle chosen once
 * in xyflow-adapter.ts) so the line — and the union-child trunk lines that
 * hang off its midpoint, see union-child-edge.tsx — stays correct even if
 * one card gets dragged past the other.
 */
function PartnershipEdgeLine({
  id,
  source,
  target,
  isPastPartnership,
  isOnTracePath,
  isDimmed,
  traceDirection,
  tracedPartnerId,
  unionCollapse,
  isCollapsing,
}: {
  id: string;
  source: string;
  target: string;
  isPastPartnership: boolean;
  isOnTracePath: boolean;
  isDimmed: boolean;
  traceDirection: 1 | -1;
  tracedPartnerId?: string;
  unionCollapse?: RelationshipEdgeData["unionCollapse"];
  isCollapsing: boolean;
}) {
  const sourceNode = useTreeNodeGeometry(source);
  const targetNode = useTreeNodeGeometry(target);
  const { justExpanded } = useJustExpandedEdge(id);
  if (!sourceNode || !targetNode) return null;

  const sourceLeft = sourceNode.x;
  const targetLeft = targetNode.x;
  const sourceIsLeft = sourceLeft <= targetLeft;

  // The avatar/photo's own vertical center, not the card's overall center —
  // the round avatar doesn't span the card's full height, so centering on
  // the whole card would draw the line through the name/years text below
  // the avatar instead of through it.
  const y = sourceNode.y + CONNECTOR_CENTER_Y;
  // Each card's own horizontal center — not its edge — so the line visibly
  // runs "through" each card to the avatar's center (compact's round avatar
  // sits centered inside the card), instead of stopping short at the card's
  // outer border with a gap that reads as disconnected from either avatar.
  const x1Full = sourceLeft + sourceNode.width / 2;
  const x2Full = targetLeft + targetNode.width / 2;
  const yTarget = targetNode.y + CONNECTOR_CENTER_Y;

  // ...but the round avatar has NO opaque card background around it
  // (see AVATAR_RADIUS's own doc comment) — a line drawn all the way to
  // that center would cross the fully transparent padding around the
  // circle with nothing left to hide it. Pull each endpoint back by the
  // avatar's own radius (toward the OTHER end, along this already-
  // horizontal line) so the line's last visible segment always lands
  // inside the opaque circle instead of the transparent card around it.
  const x1 = x1Full + Math.sign(x2Full - x1Full) * AVATAR_RADIUS;
  const x2 = x2Full + Math.sign(x1Full - x2Full) * AVATAR_RADIUS;

  // Same midpoint the union trunk line hangs off (see
  // union-child-edge.tsx's own sourceX/sourceY) — the collapse badge sits
  // exactly where the shared descendants' own connector line starts, so it
  // reads as "there's more of the tree hanging off THIS union" rather than
  // a control floating at an arbitrary point on the partnership line.
  const midX = (x1 + x2) / 2;
  const midY = (y + yTarget) / 2;
  const collapseBadge = unionCollapse ? (
    <UnionCollapseBadge
      x={midX}
      y={midY}
      collapsedDescendantCount={unionCollapse.collapsedDescendantCount}
      collapseKey={unionCollapse.collapseKey}
      onToggleCollapse={unionCollapse.onToggleCollapse}
    />
  ) : null;

  // A trace path can reach this couple's shared child through only ONE of
  // them (parent → union trunk → child, see union-child-edge.tsx and
  // xyflow-adapter.ts's tracedPartnerId) — the partnership relationship
  // itself isn't a hop on the path, so the line as a whole isn't
  // "isOnTracePath". The traced partner's own half is drawn by
  // UnionChildEdge instead (its path extends back through this exact
  // segment to the traced parent's card, see its tracedParentId handling)
  // — one continuous <path> there gets a clean miter join at the
  // partnership midpoint, which two independently-drawn <BaseEdge>s meeting
  // at that point can't (each one's stroke-linecap end reads as a visible
  // bump instead of a sharp corner). This component only draws the OTHER
  // half — the untraced partner's plain dashed segment.
  if (!isOnTracePath && tracedPartnerId) {
    // (x1,y) belongs to whichever side is geometrically left, not
    // necessarily `source` — pick the untraced partner's own coordinates by
    // whether they're on that left side or not.
    const tracedIsLeft = (tracedPartnerId === source) === sourceIsLeft;
    const [plainX, plainY] = tracedIsLeft ? [x2, yTarget] : [x1, y];

    return (
      <>
        <BaseEdge
          id={id}
          path={`M${midX},${midY} L${plainX},${plainY}`}
          pathLength={justExpanded || isCollapsing ? 1 : undefined}
          className={cn(
            justExpanded && "animate-tree-edge-draw",
            isCollapsing && "animate-tree-edge-collapse",
          )}
          style={{
            strokeWidth: 1.5,
            stroke: "var(--branch)",
            opacity: isDimmed ? 0.35 : 1,
          }}
        />
        {isPastPartnership && (
          <DivorceBreakMark
            x={midX}
            y={midY}
            straddle={
              unionCollapse
                ? { dx: plainX - midX, dy: plainY - midY }
                : undefined
            }
            towardOnly
            gapAxis={{ dx: plainX - midX, dy: plainY - midY }}
          />
        )}
        {collapseBadge}
      </>
    );
  }

  const path = `M${x1},${y} L${x2},${yTarget}`;
  // This path is always drawn source→target (x1→x2 above) — same
  // A→B-direction pick as ParentChildEdgeLine, see its own comment.
  // isOnTracePath draws via TracedLine — see its own doc comment. Note this
  // also means the divorce break is skipped while traced, in favor of
  // TracedLine's own fixed marching-ants styling — matters less mid-trace
  // anyway, the terracotta color + motion is already the dominant signal.
  if (isOnTracePath) {
    return (
      <>
        <TracedLine
          path={path}
          traceDirection={traceDirection}
          strokeWidth={3}
        />
        {collapseBadge}
      </>
    );
  }
  // Draw-in/draw-out, spouse-to-spouse case: user feedback, 2026-09-14 —
  // "между супругами анимация должна идти от центра их союза и к ним"
  // (between spouses the line should grow from the union's own center out
  // toward each of them), not sweep across from one spouse to the other the
  // way a single `pathLength`/`stroke-dashoffset` sweep along the ONE path
  // above reads (it visually grows from x1 toward x2, i.e. "out of" one
  // spouse's card, not "out of" the union). A single dash animation can only
  // ever draw in one direction along its own path, so getting a
  // from-the-middle look needs two independent half-paths, each own its OWN
  // `<path>` element starting at the same union midpoint (midX, midY — the
  // same point the collapse badge and the UnionChildEdge trunk both already
  // anchor to) and ending at one spouse — same technique (`pathLength={1}` +
  // `.animate-tree-edge-draw`/`.animate-tree-edge-collapse`) applied to each
  // half independently, so both halves sweep outward from (or, symmetrically,
  // retract back into) the center at once.
  //
  // Collapsing plays the exact same two-half split as expanding — just the
  // reverse keyframe (`.animate-tree-edge-collapse`, globals.css) — so a
  // branch that grew "out of the union" when it appeared visibly retracts
  // "back into the union" right before it disappears, user-requested. Only
  // rendered while `justExpanded || isCollapsing` — the plain single-path
  // version below stays the unanimated steady-state shape, so this split
  // never affects hit-testing/layout once either animation has finished
  // playing.
  if (justExpanded || isCollapsing) {
    const animationClassName = justExpanded
      ? "animate-tree-edge-draw"
      : "animate-tree-edge-collapse";
    return (
      <>
        <BaseEdge
          id={id}
          path={`M${midX},${midY} L${x1},${y}`}
          pathLength={1}
          className={animationClassName}
          style={{
            strokeWidth: 1.5,
            stroke: "var(--branch)",
            opacity: isDimmed ? 0.35 : 1,
          }}
        />
        <BaseEdge
          path={`M${midX},${midY} L${x2},${yTarget}`}
          pathLength={1}
          className={animationClassName}
          style={{
            strokeWidth: 1.5,
            stroke: "var(--branch)",
            opacity: isDimmed ? 0.35 : 1,
          }}
        />
        {isPastPartnership && (
          <DivorceBreakMark
            x={midX}
            y={midY}
            straddle={
              unionCollapse ? { dx: x2 - midX, dy: yTarget - midY } : undefined
            }
            gapAxis={{ dx: x2 - midX, dy: yTarget - midY }}
          />
        )}
        {collapseBadge}
      </>
    );
  }
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          strokeWidth: 1.5,
          stroke: "var(--branch)",
          opacity: isDimmed ? 0.35 : 1,
        }}
      />
      {isPastPartnership && (
        <DivorceBreakMark
          x={midX}
          y={midY}
          straddle={
            unionCollapse ? { dx: x2 - midX, dy: yTarget - midY } : undefined
          }
          gapAxis={{ dx: x2 - midX, dy: yTarget - midY }}
        />
      )}
      {collapseBadge}
    </>
  );
}
