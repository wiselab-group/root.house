import type { Edge } from "@xyflow/react";
import type { TreeLayoutResult } from "@/domain/tree-v4/types";
import { CARD_HALF_WIDTH, CARD_HALF_HEIGHT } from "./card-geometry";
import type { PersonFlowNode } from "./person-node";

/**
 * tree-v4 — the ONLY place that converts a TreeLayoutResult (domain,
 * library-agnostic) into React Flow nodes/edges.
 *
 * Cards are draggable: nodes live in React state (see tree-canvas.tsx) and
 * edges are recomputed from the CURRENT (possibly dragged) node positions
 * on every change via buildEdgesFromPositions — not frozen at the domain's
 * original coordinates, or lines would lag behind a dragged card.
 */
export function buildReactFlowGraph(layout: TreeLayoutResult): {
  nodes: PersonFlowNode[];
  edges: Edge[];
  relationInfo: RelationInfo;
} {
  // The domain returns each card's CENTER (convenient for centering
  // pairs/children in the layout algorithm itself) — xyflow expects
  // position as the top-left corner. Converted once, here.
  const nodes: PersonFlowNode[] = layout.persons.map((p) => ({
    id: p.id,
    type: "person",
    position: { x: p.x - CARD_HALF_WIDTH, y: p.y - CARD_HALF_HEIGHT },
    data: { person: p, isFocus: p.id === layout.focusPersonId },
  }));

  const centerById = new Map(
    layout.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
  );
  const relationInfo = buildRelationInfo(layout);
  const edges = buildEdgesFromPositions(centerById, relationInfo);

  return { nodes, edges, relationInfo };
}

/**
 * Structural (not coordinate) part of the relationship graph — partnerships
 * and parent→children/solo-parent groupings — never changes on drag, only
 * positions do. Computed once from the layout result; buildEdgesFromPositions
 * is called again on every node position change (see tree-canvas.tsx).
 */
export interface RelationInfo {
  partnerships: {
    id: string;
    leftPersonId: string;
    rightPersonId: string;
    status: string;
  }[];
  childToParentIds: Map<string, string[]>;
  partnershipIdByPair: Map<string, string>;
}

function buildRelationInfo(layout: TreeLayoutResult): RelationInfo {
  const childToParentIds = new Map<string, string[]>();
  for (const rel of layout.relationships) {
    if (rel.kind !== "parent-child") continue;
    if (!childToParentIds.has(rel.to)) childToParentIds.set(rel.to, []);
    childToParentIds.get(rel.to)!.push(rel.from);
  }

  const partnershipIdByPair = new Map<string, string>();
  for (const p of layout.partnerships) {
    partnershipIdByPair.set(pairKey(p.leftPersonId, p.rightPersonId), p.id);
  }

  return {
    partnerships: layout.partnerships.map((p) => ({
      id: p.id,
      leftPersonId: p.leftPersonId,
      rightPersonId: p.rightPersonId,
      status: p.status,
    })),
    childToParentIds,
    partnershipIdByPair,
  };
}

/**
 * Recomputes every edge (partnership + parent-child) from the CURRENT card
 * centers (centerById) — called once when the layout is first built, and
 * again on every drag change (tree-canvas.tsx), so lines always originate
 * from the card's real current position, not a "frozen" original domain
 * coordinate.
 */
export function buildEdgesFromPositions(
  centerById: Map<string, { x: number; y: number }>,
  relationInfo: RelationInfo,
): Edge[] {
  const partnershipEdges: Edge[] = relationInfo.partnerships.flatMap(
    (partnership) => {
      const leftCenter = centerById.get(partnership.leftPersonId);
      const rightCenter = centerById.get(partnership.rightPersonId);
      if (!leftCenter || !rightCenter) return [];
      return [
        {
          id: partnership.id,
          type: "partnership",
          source: partnership.leftPersonId,
          target: partnership.rightPersonId,
          sourceHandle: "right",
          targetHandle: "left",
          // Line is drawn between the cards' inner edges, not from xyflow's
          // own handle geometry (see the comment in person-node.tsx).
          data: {
            leftX: leftCenter.x + CARD_HALF_WIDTH,
            leftY: leftCenter.y,
            rightX: rightCenter.x - CARD_HALF_WIDTH,
            rightY: rightCenter.y,
            status: partnership.status,
          },
        },
      ];
    },
  );

  // Junction — midpoint between the CURRENT (possibly dragged) positions of
  // both partners, not a frozen domain coordinate — dragging one spouse
  // slides the T-junction along with them, keeping the trunk line to
  // children correct instead of staying frozen at its original spot. Y is
  // averaged too (not taken from one side only) — otherwise a vertical drag
  // of one partner would tilt the dashed partnership line while the trunk
  // junction stayed at the old Y, visibly detaching from it.
  const junctionByPartnershipId = new Map<string, { x: number; y: number }>();
  for (const p of relationInfo.partnerships) {
    const leftCenter = centerById.get(p.leftPersonId);
    const rightCenter = centerById.get(p.rightPersonId);
    if (!leftCenter || !rightCenter) continue;
    junctionByPartnershipId.set(p.id, {
      x: (leftCenter.x + rightCenter.x) / 2,
      y: (leftCenter.y + rightCenter.y) / 2,
    });
  }

  // Each child gets exactly one parent-child line — from the partnership
  // junction (when both parents are known and their partnership resolved)
  // or from the single known parent (solo parent, other parent absent from
  // the graph).
  const parentChildEdges: Edge[] = [];
  for (const [childId, parentIds] of relationInfo.childToParentIds) {
    const childCenter = centerById.get(childId);
    if (!childCenter) continue;

    let fromCenter: { x: number; y: number } | undefined;
    let sourceId = parentIds[0];
    if (parentIds.length === 2) {
      const partnershipId = relationInfo.partnershipIdByPair.get(
        pairKey(parentIds[0], parentIds[1]),
      );
      if (partnershipId) {
        fromCenter = junctionByPartnershipId.get(partnershipId);
        sourceId = parentIds[0];
      }
    }
    if (!fromCenter) {
      // Solo parent (other parent absent from graph) — the "union" is the parent themself.
      fromCenter = centerById.get(parentIds[0]);
      sourceId = parentIds[0];
    }
    if (!fromCenter) continue;

    parentChildEdges.push({
      id: `${childId}-parent-child`,
      type: "parent-child",
      source: sourceId,
      target: childId,
      sourceHandle: "bottom",
      targetHandle: "top",
      data: {
        fromX: fromCenter.x,
        fromY: fromCenter.y,
        toX: childCenter.x,
        toY: childCenter.y,
      },
    });
  }

  return [...partnershipEdges, ...parentChildEdges];
}

function pairKey(aId: string, bId: string): string {
  return aId <= bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}
