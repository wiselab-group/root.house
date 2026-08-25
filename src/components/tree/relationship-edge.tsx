"use client";

import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
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
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<RelationshipFlowEdge>) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  const isPartnership = type === "partnership";
  const isPastPartnership = isPartnership && data?.isCurrent === false;
  const isOnTracePath = data?.isOnTracePath === true;

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        strokeWidth: isOnTracePath ? 3 : isPartnership ? 1.5 : 2,
        strokeDasharray: isPartnership ? (isPastPartnership ? "2 4" : "5 3") : undefined,
        stroke: isOnTracePath ? "var(--primary)" : isPartnership ? "var(--muted-foreground)" : "var(--border)",
      }}
    />
  );
}
