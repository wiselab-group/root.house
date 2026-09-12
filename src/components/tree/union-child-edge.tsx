"use client";

import { BaseEdge, type EdgeProps } from "@xyflow/react";
import {
  AVATAR_RADIUS,
  CONNECTOR_CENTER_Y,
  type UnionChildFlowEdge,
} from "./adapters/xyflow-adapter";
import {
  COMPACT_CHILD_TAIL_LENGTH,
  TRACE_COLOR,
  traceMarchClassName,
} from "./relationship-edge";
import { roundedOrthogonalPath } from "./orthogonal-path";
import { useTreeNodeGeometry } from "./tree-layout-positions-context";

/**
 * The trunk line from a couple's partnership line down to one of their
 * shared children — see xyflow-adapter.ts's findUnionParentPairs for why
 * this exists as its own edge type instead of a plain parent_child edge.
 *
 * Unlike every other tree edge, this one can't use its EdgeProps
 * sourceX/sourceY: there is no real node sitting at the union point, only
 * `data.parentAId`/`parentBId` naming the two actual parent nodes. Reading
 * their positions from TreeLayoutPositionsContext (rather than computing the
 * midpoint once in xyflow-adapter.ts) is what keeps this line's start point
 * glued to the partnership line if either parent card gets dragged — the
 * context's own positions map is derived from `nodes`, which XYFlow's
 * onNodesChange already updates every drag frame (see that context's own
 * doc comment for why this needs no separate live/DOM-measured source, even
 * during drag). Same context for `target`'s own position — EdgeProps'
 * targetX/targetY (this component's own former source) come from XYFlow's
 * handle-position DOM measurement, exactly the mechanism that goes stale on
 * unmount/remount under onlyRenderVisibleElements (rewrite plan §7 Stage 6).
 */
export function UnionChildEdge({
  id,
  target,
  data,
}: EdgeProps<UnionChildFlowEdge>) {
  const parentA = useTreeNodeGeometry(data?.parentAId ?? "");
  const parentB = useTreeNodeGeometry(data?.parentBId ?? "");
  const targetNode = useTreeNodeGeometry(target);
  const isOnTracePath = data?.isOnTracePath === true;
  // Same undefined-vs-false distinction as RelationshipEdge's own isDimmed:
  // undefined means no trace is active (never dim), false means a trace IS
  // active and this trunk isn't part of it.
  const isDimmed = data?.isOnTracePath === false;
  // See UnionChildEdgeData.hideSharedStem's own comment — this sibling skips
  // the shared sourceY→midY vertical run entirely (only set true when a
  // traced sibling shares this exact row) rather than drawing a dimmed copy
  // of it, since a dimmed copy would still show through the traced
  // sibling's dash gaps sitting on the exact same pixels.
  const hideSharedStem = data?.hideSharedStem === true;
  // This trunk is always drawn parent→child (tracedStart/trunkPoints below
  // both run toward targetX/targetY) — same meaning as
  // RelationshipEdgeData.traceDirection (xyflow-adapter.ts computes this
  // one from the underlying pc-<parent>-<child> edge, which is always
  // recorded parent→child too), so traceMarchClassName's forward/reverse
  // pick below needs no extra adjustment for this edge type.
  const traceDirection = data?.traceDirection ?? 1;

  if (!parentA || !parentB || !targetNode) return null;

  const targetX = targetNode.x + targetNode.width / 2;
  const targetY = targetNode.y;

  // Midpoint between each card's own horizontal center (not its inner edge)
  // — PartnershipEdgeLine now draws its line center-to-center (through each
  // card to its avatar's center), so the trunk must start on that same
  // midpoint to land exactly on that line, not off to one side of it.
  const centerXA = parentA.x + parentA.width / 2;
  const centerXB = parentB.x + parentB.width / 2;
  const sourceX = (centerXA + centerXB) / 2;
  // Midpoint of the *two cards' own* avatar centers, not just parentA's —
  // PartnershipEdgeLine draws its line between each card's own avatar center
  // (sourceCenterY, targetCenterY, see CONNECTOR_CENTER_Y — the avatar
  // doesn't span the card's full height, so this isn't heightA/2), so once
  // the cards aren't level (either one dragged off the other's row) that
  // line is a diagonal, and using only parentA's Y here left the trunk's
  // start point off that diagonal entirely — this matches it at every drag
  // position, not just level ones.
  const centerYA = parentA.y + CONNECTOR_CENTER_Y[parentA.cardStyle];
  const centerYB = parentB.y + CONNECTOR_CENTER_Y[parentB.cardStyle];
  const sourceY = (centerYA + centerYB) / 2;
  // The trunk's own vertical run must clear both cards' bottom edges before
  // it's visible as a line — starting it at sourceY (center height) would
  // cut straight through the lower half of both parent cards. The
  // partnership line itself still runs at center height (unchanged), so this
  // is a short extra hop straight down from sourceY to the lower of the two
  // bottom edges, then the usual "down, across, down" trunk continues from there.
  const clearY = Math.max(
    parentA.y + parentA.height,
    parentB.y + parentB.height,
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
  // Pulled back by the avatar's own radius when that parent is compact —
  // same reasoning as PartnershipEdgeLine's x1/x2 (see AVATAR_RADIUS's own
  // doc comment): compact's round avatar has no opaque card background
  // around it, so a traced line ending at the exact center would leak
  // across the transparent card padding on its way in.
  const tracedStart =
    data?.tracedParentId === data?.parentAId
      ? {
          x:
            parentA.cardStyle === "compact"
              ? centerXA + Math.sign(sourceX - centerXA) * AVATAR_RADIUS
              : centerXA,
          y: centerYA,
        }
      : data?.tracedParentId === data?.parentBId
        ? {
            x:
              parentB.cardStyle === "compact"
                ? centerXB + Math.sign(sourceX - centerXB) * AVATAR_RADIUS
                : centerXB,
            y: centerYB,
          }
        : null;

  // The horizontal bend sits a fixed distance above the child, not at the
  // midpoint — matching RelationshipEdge's plain parent_child lines (see
  // there for why: only compact's round avatar needs this fixed tail;
  // portrait's square photo already fills the card from its top edge).
  const isCompactChild = targetNode.cardStyle === "compact";
  const midY = isCompactChild
    ? Math.max(clearY, targetY - COMPACT_CHILD_TAIL_LENGTH)
    : (clearY + targetY) / 2;
  // hideSharedStem drops the ENTIRE sourceY→midY vertical run, not just the
  // sourceY→clearY leg — every sibling off the same union sharing this same
  // row (same midY, the overwhelmingly common case) has an identical
  // vertical segment all the way down to its own turn at midY, not just up
  // to clearY (a real bug caught on real data: clearY sits partway down
  // that shared run, at the parents' own card-bottom height, not at the
  // sibling row's bend height — the two only coincide when parents and
  // children are adjacent generations with no extra vertical gap). This
  // sibling's own visible line starts right at (sourceX, midY) instead,
  // exactly where the shared stem (drawn once, by whichever sibling is
  // traced) leaves off to jog sideways into each child's own card.
  const trunkPoints = hideSharedStem
    ? [
        { x: sourceX, y: midY },
        { x: targetX, y: midY },
        { x: targetX, y: targetY },
      ]
    : [
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
      className={
        isOnTracePath ? traceMarchClassName(traceDirection) : undefined
      }
      style={{
        strokeWidth: isOnTracePath ? 3 : 2,
        stroke: isOnTracePath ? TRACE_COLOR : "var(--branch)",
        opacity: isDimmed ? 0.35 : 1,
      }}
    />
  );
}
