"use client";

import { BaseEdge, useInternalNode, type EdgeProps } from "@xyflow/react";
import type { RelationshipFlowEdge } from "./adapters/xyflow-adapter";

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
        style={{ strokeWidth: isOnTracePath ? 3 : 2, stroke: isOnTracePath ? "var(--primary)" : "var(--border)" }}
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
}: {
  id: string;
  source: string;
  target: string;
  isPastPartnership: boolean;
  isOnTracePath: boolean;
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

  return (
    <BaseEdge
      id={id}
      path={`M${x1},${y} L${x2},${yTarget}`}
      style={{
        strokeWidth: isOnTracePath ? 3 : 1.5,
        strokeDasharray: isPastPartnership ? "2 4" : "5 3",
        stroke: isOnTracePath ? "var(--primary)" : "var(--muted-foreground)",
      }}
    />
  );
}
