"use client";

import { BaseEdge, type EdgeProps } from "@xyflow/react";
import {
  CONNECTOR_CENTER_Y,
  type RelationshipFlowEdge,
} from "./adapters/xyflow-adapter";
import { roundedOrthogonalPath } from "./orthogonal-path";
import { useTreeNodeGeometry } from "./tree-layout-positions-context";

/**
 * Relationship Trace's line color — terracotta (--primary), matching the
 * traced cards' own border (see person-node-parts.tsx's buildCardFrameClassName:
 * isFocusOrTraced always uses --primary, never --tree-accent). Terracotta is
 * reserved across the whole app for "what the user is doing/looking at right
 * now" — a trace is exactly that — while sage (--tree-accent/--chart-N)
 * means "this is a person", the tree's permanent per-card identity color
 * (see globals.css's own comment on the three-hue role split). Also keeps
 * the traced path visually distinct from --branch, the warm brown used for
 * every other (non-traced) tree line.
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
 * Renders parent_child edges as a solid line and partnership edges as
 * dashed — the visual distinction between "descent" and "union" the plan's
 * DESIGN.md calls for, without needing separate label text on every edge.
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
        isMiddleSibling={data?.isMiddleSibling === true}
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
      tracedPartnerId={data?.tracedPartnerId}
    />
  );
}

function ParentChildEdgeLine({
  id,
  source,
  target,
  isOnTracePath,
  isMiddleSibling,
}: {
  id: string;
  source: string;
  target: string;
  isOnTracePath: boolean;
  isMiddleSibling: boolean;
}) {
  const sourceNode = useTreeNodeGeometry(source);
  const targetNode = useTreeNodeGeometry(target);
  if (!sourceNode || !targetNode) return null;

  // Read the parent's bottom edge from the committed layout position
  // (TreeLayoutPositionsContext — see its own doc comment for why this
  // replaced useInternalNode's live DOM-measured internals.positionAbsolute
  // + measured.height). Both x/y AND width/height come from that same
  // non-DOM-dependent source now — width/height are the static per-cardStyle
  // dimensions (xyflow-adapter.ts's NODE_DIMENSIONS), same numbers
  // useInternalNode's own `measured` fallback (`measured?.height ?? height`)
  // resolved to before a real DOM measurement existed, and — unlike
  // `measured` — never goes stale across a node unmounting/remounting under
  // onlyRenderVisibleElements (rewrite plan §7 Stage 6).
  const sourceBottomY = sourceNode.y + sourceNode.height;
  const sourceCenterX = sourceNode.x + sourceNode.width / 2;
  const targetTopY = targetNode.y;
  const targetCenterX = targetNode.x + targetNode.width / 2;

  // Portrait's square photo already fills the card from its very top edge,
  // so the plain midpoint bend already reads fine there and a fixed tail
  // would look arbitrary against a square corner — only compact's round
  // avatar (which sits well clear of the card's top edge, see
  // CONNECTOR_CENTER_Y) needs the fixed-length tail below.
  const isCompactChild = targetNode.cardStyle === "compact";
  const midY = isCompactChild
    ? Math.max(sourceBottomY, targetTopY - COMPACT_CHILD_TAIL_LENGTH)
    : (sourceBottomY + targetTopY) / 2;
  // (targetX, midY) is this child's own turn down into its card — for a
  // middle sibling (flanked by others on both sides, see
  // xyflow-adapter.ts's isMiddleSibling) that turn is a sideways jog that
  // reads as an ugly zigzag when rounded, so it's drawn sharp instead. The
  // OTHER bend, (sourceX, midY), is the T-off-the-trunk point — already a
  // clean rounded corner regardless of sibling count, left untouched.
  const path = roundedOrthogonalPath(
    [
      { x: sourceCenterX, y: sourceBottomY },
      { x: sourceCenterX, y: midY },
      { x: targetCenterX, y: midY },
      { x: targetCenterX, y: targetTopY },
    ],
    isMiddleSibling ? [{ x: targetCenterX, y: midY }] : [],
  );
  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        strokeWidth: isOnTracePath ? 3 : 2,
        stroke: isOnTracePath ? TRACE_COLOR : "var(--branch)",
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
  tracedPartnerId,
}: {
  id: string;
  source: string;
  target: string;
  isPastPartnership: boolean;
  isOnTracePath: boolean;
  tracedPartnerId?: string;
}) {
  const sourceNode = useTreeNodeGeometry(source);
  const targetNode = useTreeNodeGeometry(target);
  if (!sourceNode || !targetNode) return null;

  const sourceLeft = sourceNode.x;
  const targetLeft = targetNode.x;
  const sourceIsLeft = sourceLeft <= targetLeft;

  // The avatar/photo's own vertical center, not the card's overall center —
  // compact's round avatar (and portrait's square photo) doesn't span the
  // card's full height, so centering on the whole card would draw the line
  // through the name/years text below the avatar instead of through it.
  const sourceCenterY = CONNECTOR_CENTER_Y[sourceNode.cardStyle];
  const targetCenterY = CONNECTOR_CENTER_Y[targetNode.cardStyle];
  const y = sourceNode.y + sourceCenterY;
  // Each card's own horizontal center — not its edge — so the line visibly
  // runs "through" each card to the avatar's center (compact's round avatar
  // sits centered inside the card), instead of stopping short at the card's
  // outer border with a gap that reads as disconnected from either avatar.
  const x1 = sourceLeft + sourceNode.width / 2;
  const x2 = targetLeft + targetNode.width / 2;
  const yTarget = targetNode.y + targetCenterY;

  const dashStyle = {
    strokeDasharray: isPastPartnership ? "2 4" : "5 3",
  };

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
    const midX = (x1 + x2) / 2;
    const midY = (y + yTarget) / 2;
    // (x1,y) belongs to whichever side is geometrically left, not
    // necessarily `source` — pick the untraced partner's own coordinates by
    // whether they're on that left side or not.
    const tracedIsLeft = (tracedPartnerId === source) === sourceIsLeft;
    const [plainX, plainY] = tracedIsLeft ? [x2, yTarget] : [x1, y];

    return (
      <BaseEdge
        id={id}
        path={`M${midX},${midY} L${plainX},${plainY}`}
        style={{
          strokeWidth: 1.5,
          stroke: "var(--branch)",
          ...dashStyle,
        }}
      />
    );
  }

  return (
    <BaseEdge
      id={id}
      path={`M${x1},${y} L${x2},${yTarget}`}
      style={{
        strokeWidth: isOnTracePath ? 3 : 1.5,
        stroke: isOnTracePath ? TRACE_COLOR : "var(--branch)",
        ...dashStyle,
      }}
    />
  );
}
