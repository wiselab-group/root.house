"use client";

import { BaseEdge, type EdgeProps } from "@xyflow/react";
import { CARD_HALF_HEIGHT } from "./card-geometry";
import { roundedOrthogonalPath, type Point } from "./orthogonal-path";

/** Vertical clearance below the parent partnership junction (or a solo parent's card) before the horizontal trunk segment. */
const TRUNK_CLEARANCE = 16;

/**
 * tree-v4 — trunk line from a partnership junction (or a solo parent's own
 * position) down to a child: down → across → down, with rounded corners
 * (orthogonal routing, minimal crossings, edges never pass through cards).
 *
 * fromX/fromY/toX/toY come through data (computed in domain edges.ts from
 * the same center coordinates as node positions).
 */
export function ParentChildEdge({ data }: EdgeProps) {
  const fromX = typeof data?.fromX === "number" ? data.fromX : 0;
  const fromY = typeof data?.fromY === "number" ? data.fromY : 0;
  const toX = typeof data?.toX === "number" ? data.toX : fromX;
  const toY = typeof data?.toY === "number" ? data.toY : fromY;

  const endY = toY - CARD_HALF_HEIGHT;
  const midY = fromY + CARD_HALF_HEIGHT + TRUNK_CLEARANCE;

  const points: Point[] = [
    { x: fromX, y: fromY },
    { x: fromX, y: midY },
    { x: toX, y: midY },
    { x: toX, y: endY },
  ];

  return (
    <BaseEdge
      path={roundedOrthogonalPath(points)}
      className="stroke-border"
      style={{ strokeWidth: 2 }}
    />
  );
}
