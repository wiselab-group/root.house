"use client";

import { BaseEdge, useInternalNode, type EdgeProps } from "@xyflow/react";
import type { RelationshipFlowEdge } from "./adapters/xyflow-adapter";

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
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<RelationshipFlowEdge>) {
  const isPartnership = type === "partnership";
  const isPastPartnership = isPartnership && data?.isCurrent === false;
  const isOnTracePath = data?.isOnTracePath === true;

  // parent_child edges (including union-child trunk lines, see
  // union-child-edge.tsx) are built as an explicit right-angle polyline
  // instead of XYFlow's getSmoothStepPath: that helper computes rounded
  // corners from the *distance* between its bend points, which comes out
  // visibly curved for short/near-zero segments — a hand-built
  // "down, across, down" path has no such edge case.
  if (!isPartnership) {
    const midY = (sourceY + targetY) / 2;
    const path = `M${sourceX},${sourceY} L${sourceX},${midY} L${targetX},${midY} L${targetX},${targetY}`;
    return (
      <BaseEdge
        id={id}
        path={path}
        style={{ strokeWidth: isOnTracePath ? 3 : 2, stroke: isOnTracePath ? TRACE_COLOR : "var(--border)" }}
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
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;

  const sourceWidth = sourceNode.measured?.width ?? sourceNode.width ?? 0;
  const sourceHeight = sourceNode.measured?.height ?? sourceNode.height ?? 0;
  const targetHeight = targetNode.measured?.height ?? targetNode.height ?? 0;
  const sourceLeft = sourceNode.internals.positionAbsolute.x;
  const targetLeft = targetNode.internals.positionAbsolute.x;
  const sourceIsLeft = sourceLeft <= targetLeft;

  const y = sourceNode.internals.positionAbsolute.y + sourceHeight / 2;
  const x1 = sourceIsLeft ? sourceLeft + sourceWidth : sourceLeft;
  const x2 = sourceIsLeft ? targetLeft : targetLeft + (targetNode.measured?.width ?? targetNode.width ?? 0);
  // Both cards are the same cardStyle/height in practice, but average the
  // two just in case a future layout ever mixes sizes within a row.
  const yTarget = targetNode.internals.positionAbsolute.y + targetHeight / 2;

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
        style={{ strokeWidth: 1.5, stroke: "var(--muted-foreground)", ...dashStyle }}
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
