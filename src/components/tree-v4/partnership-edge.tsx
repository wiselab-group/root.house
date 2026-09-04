"use client";

import { BaseEdge, type EdgeProps } from "@xyflow/react";

/**
 * tree-v4 — horizontal line between spouses. Dashed = a living partnership
 * (married/partnered/widowed), a lighter dotted stroke = divorced — divorce
 * must not remove this edge from the tree (it still shows who a shared
 * child's parents are), just visually distinguish it from a current union.
 *
 * Coordinates come through data.leftX/leftY/rightX/rightY, computed by the
 * domain edges.ts from the same center coordinates as the node positions —
 * not from xyflow's sourceX/targetX (those come from the invisible handle's
 * CSS position, which sits a few px inset from the true card edge).
 */
export function PartnershipEdge({ data }: EdgeProps) {
  const leftX = typeof data?.leftX === "number" ? data.leftX : 0;
  const leftY = typeof data?.leftY === "number" ? data.leftY : 0;
  const rightX = typeof data?.rightX === "number" ? data.rightX : leftX;
  const rightY = typeof data?.rightY === "number" ? data.rightY : leftY;
  const status = typeof data?.status === "string" ? data.status : "married";
  const isDivorced = status === "divorced";

  return (
    <BaseEdge
      path={`M${leftX},${leftY} L${rightX},${rightY}`}
      className={
        isDivorced ? "stroke-muted-foreground/50" : "stroke-muted-foreground"
      }
      style={{
        strokeWidth: 1.5,
        strokeDasharray: isDivorced ? "2 4" : "5 3",
      }}
    />
  );
}
