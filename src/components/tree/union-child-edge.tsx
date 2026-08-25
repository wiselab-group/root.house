"use client";

import { BaseEdge, useInternalNode, type EdgeProps } from "@xyflow/react";
import type { UnionChildFlowEdge } from "./adapters/xyflow-adapter";

/**
 * The trunk line from a couple's partnership line down to one of their
 * shared children — see xyflow-adapter.ts's findUnionParentPairs for why
 * this exists as its own edge type instead of a plain parent_child edge.
 *
 * Unlike every other tree edge, this one can't use its EdgeProps
 * sourceX/sourceY: there is no real node sitting at the union point, only
 * `data.parentAId`/`parentBId` naming the two actual parent nodes. Reading
 * their *live* positions with useInternalNode (rather than computing the
 * midpoint once in xyflow-adapter.ts) is what keeps this line's start point
 * glued to the partnership line if either parent card gets dragged —
 * useInternalNode re-renders this component on every position change,
 * dragged or not.
 */
export function UnionChildEdge({
  id,
  targetX,
  targetY,
  data,
}: EdgeProps<UnionChildFlowEdge>) {
  const parentA = useInternalNode(data?.parentAId ?? "");
  const parentB = useInternalNode(data?.parentBId ?? "");
  const isOnTracePath = data?.isOnTracePath === true;

  if (!parentA || !parentB) return null;

  // internals.positionAbsolute + measured is the same "live, resolved"
  // geometry XYFlow itself uses to draw handles — width/height fall back to
  // the design-time size (set in xyflow-adapter.ts's NODE_DIMENSIONS) for
  // the first paint, before XYFlow has measured the actual DOM node.
  const widthA = parentA.measured?.width ?? parentA.width ?? 0;
  const widthB = parentB.measured?.width ?? parentB.width ?? 0;
  const heightA = parentA.measured?.height ?? parentA.height ?? 0;
  const heightB = parentB.measured?.height ?? parentB.height ?? 0;
  const xA = parentA.internals.positionAbsolute.x;
  const xB = parentB.internals.positionAbsolute.x;
  const aIsLeft = xA <= xB;
  // Midpoint between the *inner* edges of the two cards (right edge of
  // whichever one is on the left, left edge of whichever is on the right)
  // — the same span PartnershipEdgeLine draws its horizontal line across,
  // so the trunk starts exactly on that line, not off to one side of it.
  const innerLeft = aIsLeft ? xA + widthA : xB + widthB;
  const innerRight = aIsLeft ? xB : xA;
  const sourceX = (innerLeft + innerRight) / 2;
  // Midpoint of the *two cards' own* vertical centers, not just parentA's —
  // PartnershipEdgeLine draws its line between each card's own center
  // (sourceCenterY, targetCenterY), so once the cards aren't level (either
  // one dragged off the other's row) that line is a diagonal, and using
  // only parentA's Y here left the trunk's start point off that diagonal
  // entirely — this matches it at every drag position, not just level ones.
  const centerYA = parentA.internals.positionAbsolute.y + heightA / 2;
  const centerYB = parentB.internals.positionAbsolute.y + heightB / 2;
  const sourceY = (centerYA + centerYB) / 2;

  const midY = (sourceY + targetY) / 2;
  const path = `M${sourceX},${sourceY} L${sourceX},${midY} L${targetX},${midY} L${targetX},${targetY}`;

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        strokeWidth: isOnTracePath ? 3 : 2,
        stroke: isOnTracePath ? "var(--primary)" : "var(--border)",
      }}
    />
  );
}
