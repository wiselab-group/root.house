"use client";

import { BaseEdge, useInternalNode, type EdgeProps } from "@xyflow/react";
import {
  CONNECTOR_CENTER_Y,
  type PersonFlowNode,
  type UnionChildFlowEdge,
} from "./adapters/xyflow-adapter";
import { COMPACT_CHILD_TAIL_LENGTH, TRACE_COLOR } from "./relationship-edge";
import { roundedOrthogonalPath } from "./orthogonal-path";

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
  target,
  targetX,
  targetY,
  data,
}: EdgeProps<UnionChildFlowEdge>) {
  const parentA = useInternalNode<PersonFlowNode>(data?.parentAId ?? "");
  const parentB = useInternalNode<PersonFlowNode>(data?.parentBId ?? "");
  const targetNode = useInternalNode<PersonFlowNode>(target);
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
  // Midpoint between each card's own horizontal center (not its inner edge)
  // — PartnershipEdgeLine now draws its line center-to-center (through each
  // card to its avatar's center), so the trunk must start on that same
  // midpoint to land exactly on that line, not off to one side of it.
  const centerXA = xA + widthA / 2;
  const centerXB = xB + widthB / 2;
  const sourceX = (centerXA + centerXB) / 2;
  // Midpoint of the *two cards' own* avatar centers, not just parentA's —
  // PartnershipEdgeLine draws its line between each card's own avatar center
  // (sourceCenterY, targetCenterY, see CONNECTOR_CENTER_Y — the avatar
  // doesn't span the card's full height, so this isn't heightA/2), so once
  // the cards aren't level (either one dragged off the other's row) that
  // line is a diagonal, and using only parentA's Y here left the trunk's
  // start point off that diagonal entirely — this matches it at every drag
  // position, not just level ones.
  const centerYA =
    parentA.internals.positionAbsolute.y +
    CONNECTOR_CENTER_Y[parentA.data.cardStyle];
  const centerYB =
    parentB.internals.positionAbsolute.y +
    CONNECTOR_CENTER_Y[parentB.data.cardStyle];
  const sourceY = (centerYA + centerYB) / 2;
  // The trunk's own vertical run must clear both cards' bottom edges before
  // it's visible as a line — starting it at sourceY (center height) would
  // cut straight through the lower half of both parent cards. The
  // partnership line itself still runs at center height (unchanged), so this
  // is a short extra hop straight down from sourceY to the lower of the two
  // bottom edges, then the usual "down, across, down" trunk continues from there.
  const clearY = Math.max(
    parentA.internals.positionAbsolute.y + heightA,
    parentB.internals.positionAbsolute.y + heightB,
  );

  // If the trace path reaches this child through only one parent, extend
  // the path's start all the way back to that parent's own card center (the
  // same point PartnershipEdgeLine's dashed line would start from) — one
  // continuous <path> from parent through the partnership midpoint down to
  // the child gets one smoothly rounded corner at every bend, instead of
  // this trunk meeting a separately-drawn accent segment of the partnership
  // line (two independently stroke-capped <path>s bumping into each other,
  // see relationship-edge.tsx's PartnershipEdgeLine) at the midpoint with a
  // visibly bumped corner that no per-path rounding could smooth over.
  const tracedStart =
    data?.tracedParentId === data?.parentAId
      ? { x: centerXA, y: centerYA }
      : data?.tracedParentId === data?.parentBId
        ? { x: centerXB, y: centerYB }
        : null;

  // The horizontal bend sits a fixed distance above the child, not at the
  // midpoint — matching RelationshipEdge's plain parent_child lines (see
  // there for why: only compact's round avatar needs this fixed tail;
  // portrait's square photo already fills the card from its top edge).
  const isCompactChild = targetNode?.data.cardStyle === "compact";
  const midY = isCompactChild
    ? Math.max(clearY, targetY - COMPACT_CHILD_TAIL_LENGTH)
    : (clearY + targetY) / 2;
  const trunkPoints = [
    { x: sourceX, y: sourceY },
    { x: sourceX, y: clearY },
    { x: sourceX, y: midY },
    { x: targetX, y: midY },
    { x: targetX, y: targetY },
  ];
  // (targetX, midY) is this child's own turn down into its card — for a
  // middle sibling (flanked by others on both sides, see
  // xyflow-adapter.ts's isMiddleSibling) that turn is a sideways jog that
  // reads as an ugly zigzag when rounded, so it's drawn sharp instead. The
  // OTHER bend, (sourceX, midY), is the T-off-the-trunk point — already a
  // clean rounded corner regardless of sibling count, left untouched.
  const path = roundedOrthogonalPath(
    tracedStart ? [tracedStart, ...trunkPoints] : trunkPoints,
    data?.isMiddleSibling ? [{ x: targetX, y: midY }] : [],
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
