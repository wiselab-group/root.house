"use client";

import { BaseEdge, useInternalNode, type EdgeProps } from "@xyflow/react";
import {
  CONNECTOR_CENTER_Y,
  type PersonFlowNode,
  type RelationshipFlowEdge,
} from "./adapters/xyflow-adapter";
import { roundedOrthogonalPath } from "./orthogonal-path";

/**
 * Relationship Trace's line color — deliberately --chart-2, not --primary:
 * --primary is only as muted as --chart-2 for the focus person's own card
 * (generation distance 0); every other card's top stripe fades further
 * (--chart-3, --chart-4...), so a full-strength --primary line reads as
 * louder than any card it's actually connecting. --chart-2 sits one step
 * back from full strength, matching the traced cards' own accent weight.
 */
export const TRACE_COLOR = "var(--chart-2)";

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
  const sourceNode = useInternalNode<PersonFlowNode>(source);
  const targetNode = useInternalNode<PersonFlowNode>(target);
  if (!sourceNode || !targetNode) return null;

  // Read the parent's LIVE bottom edge (positionAbsolute.y + measured.height)
  // rather than XYFlow's own EdgeProps sourceY (which comes from where the
  // invisible <Handle id="bottom"> sits — see person-node.tsx). That handle
  // is positioned by CSS at the bottom of the node's DESIGN-TIME box
  // (xyflow-adapter.ts's NODE_DIMENSIONS, currently compact: 200px), not the
  // card's actual rendered height — compact's real content (an 88px round
  // avatar + two lines of text) is only ~120px tall, leaving ~80px of empty
  // space between the visible avatar and where the handle (and therefore
  // sourceY) actually sits. The resulting line was drawn only across that
  // last COMPACT_CHILD_TAIL_LENGTH stretch near the child, floating with a
  // large visible gap above it instead of starting at the parent's card —
  // real bug the user caught with screenshots, persisting even on a fresh
  // page load with no cardStyle toggle involved at all (so the compact/
  // portrait toggle race fixed elsewhere in this file was a red herring for
  // THIS specific bug). measured.height matches the DOM's actual rendered
  // box regardless of NODE_DIMENSIONS drifting out of sync with a card
  // redesign (as it already had — see NODE_DIMENSIONS' own doc comment,
  // written for a since-shrunk avatar), so this is self-correcting instead
  // of needing a hand-tuned pixel constant kept in sync forever.
  const sourceBottomY =
    sourceNode.internals.positionAbsolute.y +
    (sourceNode.measured?.height ?? sourceNode.height ?? 0);
  const sourceCenterX =
    sourceNode.internals.positionAbsolute.x +
    (sourceNode.measured?.width ?? sourceNode.width ?? 0) / 2;
  const targetTopY = targetNode.internals.positionAbsolute.y;
  const targetCenterX =
    targetNode.internals.positionAbsolute.x +
    (targetNode.measured?.width ?? targetNode.width ?? 0) / 2;

  // Portrait's square photo already fills the card from its very top edge,
  // so the plain midpoint bend already reads fine there and a fixed tail
  // would look arbitrary against a square corner — only compact's round
  // avatar (which sits well clear of the card's top edge, see
  // CONNECTOR_CENTER_Y) needs the fixed-length tail below.
  const isCompactChild = targetNode.data.cardStyle === "compact";
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
        stroke: isOnTracePath ? TRACE_COLOR : "var(--muted-foreground)",
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
  const sourceNode = useInternalNode<PersonFlowNode>(source);
  const targetNode = useInternalNode<PersonFlowNode>(target);
  if (!sourceNode || !targetNode) return null;

  const sourceWidth = sourceNode.measured?.width ?? sourceNode.width ?? 0;
  const targetWidth = targetNode.measured?.width ?? targetNode.width ?? 0;
  const sourceLeft = sourceNode.internals.positionAbsolute.x;
  const targetLeft = targetNode.internals.positionAbsolute.x;
  const sourceIsLeft = sourceLeft <= targetLeft;

  // The avatar/photo's own vertical center, not the card's overall center —
  // compact's round avatar (and portrait's square photo) doesn't span the
  // card's full height, so centering on the whole card would draw the line
  // through the name/years text below the avatar instead of through it.
  const sourceCenterY = CONNECTOR_CENTER_Y[sourceNode.data.cardStyle];
  const targetCenterY = CONNECTOR_CENTER_Y[targetNode.data.cardStyle];
  const y = sourceNode.internals.positionAbsolute.y + sourceCenterY;
  // Each card's own horizontal center — not its edge — so the line visibly
  // runs "through" each card to the avatar's center (compact's round avatar
  // sits centered inside the card), instead of stopping short at the card's
  // outer border with a gap that reads as disconnected from either avatar.
  const x1 = sourceLeft + sourceWidth / 2;
  const x2 = targetLeft + targetWidth / 2;
  const yTarget = targetNode.internals.positionAbsolute.y + targetCenterY;

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
          stroke: "var(--muted-foreground)",
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
        stroke: isOnTracePath ? TRACE_COLOR : "var(--muted-foreground)",
        ...dashStyle,
      }}
    />
  );
}
