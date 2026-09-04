import type { NormalizedGraph, Point } from "./types";

export interface PartnershipEdgeSpec {
  id: string;
  partnershipId: string;
  leftPersonId: string;
  rightPersonId: string;
  status: string;
  leftPoint: Point;
  rightPoint: Point;
}

export interface ParentChildEdgeSpec {
  id: string;
  partnershipId: string | null;
  parentPersonId: string | null; // set only for solo-parent edges (no partnership junction)
  childId: string;
  fromPoint: Point;
  toPoint: Point;
}

export interface EdgeSpecs {
  partnershipEdges: PartnershipEdgeSpec[];
  parentChildEdges: ParentChildEdgeSpec[];
}

/**
 * buildEdgeSpecs — pure-data edge description, independent of any rendering
 * library (React Flow adapter consumes this in src/components/tree-v4). One
 * partnership edge per couple, one parent-child edge per child connecting to
 * either the shared partnership's junction point (T-shaped connector, §29)
 * or directly to a solo parent when no partnership is recorded.
 */
export function buildEdgeSpecs(
  graph: NormalizedGraph,
  positionByPerson: Map<string, Point>,
  junctionByPartnership: Map<string, Point>,
): EdgeSpecs {
  const partnershipEdges: PartnershipEdgeSpec[] = [];
  const parentChildEdges: ParentChildEdgeSpec[] = [];

  for (const partnership of graph.partnershipById.values()) {
    const leftPoint = positionByPerson.get(partnership.leftPersonId);
    const rightPoint = positionByPerson.get(partnership.rightPersonId);
    if (leftPoint && rightPoint) {
      partnershipEdges.push({
        id: `partnership-${partnership.id}`,
        partnershipId: partnership.id,
        leftPersonId: partnership.leftPersonId,
        rightPersonId: partnership.rightPersonId,
        status: partnership.status,
        leftPoint,
        rightPoint,
      });
    }

    const junction = junctionByPartnership.get(partnership.id);
    if (!junction) continue;
    for (const childId of partnership.childrenIds) {
      const childPoint = positionByPerson.get(childId);
      if (!childPoint) continue;
      parentChildEdges.push({
        id: `parent-child-${partnership.id}-${childId}`,
        partnershipId: partnership.id,
        parentPersonId: null,
        childId,
        fromPoint: junction,
        toPoint: childPoint,
      });
    }
  }

  for (const solo of graph.soloParentByPersonId.values()) {
    const parentPoint = positionByPerson.get(solo.personId);
    if (!parentPoint) continue;
    for (const childId of solo.childrenIds) {
      const childPoint = positionByPerson.get(childId);
      if (!childPoint) continue;
      parentChildEdges.push({
        id: `parent-child-solo-${solo.personId}-${childId}`,
        partnershipId: null,
        parentPersonId: solo.personId,
        childId,
        fromPoint: parentPoint,
        toPoint: childPoint,
      });
    }
  }

  return { partnershipEdges, parentChildEdges };
}
