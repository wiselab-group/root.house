import type { NormalizedGraph, Relationship } from "./types";
import type { PlacedPosition } from "./placement";

/**
 * tree-v3 — layout-независимое описание рёбер для рендера (§33): partnership
 * (муж-жена junction) и parent-child (T-образная линия от junction/родителя
 * к каждому ребёнку). React Flow адаптер (react-flow-adapter.ts) превращает
 * это в конкретные Edge-объекты; сама геометрия SVG-путей остаётся во view-
 * слое (components/tree-v3), т.к. зависит от card-geometry (§48: domain не
 * знает о React/DOM).
 */

export interface PartnershipEdgeSpec {
  id: string;
  leftPersonId: string;
  rightPersonId: string;
  leftPos: PlacedPosition;
  rightPos: PlacedPosition;
}

export interface ParentChildEdgeSpec {
  id: string;
  childId: string;
  childPos: PlacedPosition;
  /** Junction-точка родителей (partnership) либо позиция единственного solo-родителя. */
  unionPos: PlacedPosition;
  /** Все id родителей, входящих в этот union (1 или 2) — для future styling (divorced и т.п.), не используется для геометрии линии. */
  parentIds: string[];
}

export interface EdgeSpecs {
  partnerships: PartnershipEdgeSpec[];
  parentChild: ParentChildEdgeSpec[];
}

export function buildEdgeSpecs(
  graph: NormalizedGraph,
  positionByPerson: Map<string, PlacedPosition>,
  junctionByPartnership: Map<string, PlacedPosition>,
): EdgeSpecs {
  const partnerships: PartnershipEdgeSpec[] = [];
  for (const [id, partnership] of graph.partnershipById) {
    const leftPos = positionByPerson.get(partnership.leftPersonId);
    const rightPos = positionByPerson.get(partnership.rightPersonId);
    if (!leftPos || !rightPos) continue; // не должно происходить при корректном graph, но не рушим рендер (§32).
    partnerships.push({
      id,
      leftPersonId: partnership.leftPersonId,
      rightPersonId: partnership.rightPersonId,
      leftPos,
      rightPos,
    });
  }

  // Каждый child получает РОВНО одну parent-child линию — union point
  // берётся из junctionByPartnership, если оба родителя есть и партнёрство
  // найдено; иначе — позиция единственного known-родителя (solo, §32).
  const parentChild: ParentChildEdgeSpec[] = [];
  const seenChildren = new Set<string>();
  for (const [partnershipId, partnership] of graph.partnershipById) {
    const junction = junctionByPartnership.get(partnershipId);
    for (const childId of partnership.childrenIds) {
      if (seenChildren.has(childId)) continue;
      const childPos = positionByPerson.get(childId);
      if (!childPos || !junction) continue;
      seenChildren.add(childId);
      parentChild.push({
        id: `${childId}-parent-child`,
        childId,
        childPos,
        unionPos: junction,
        parentIds: [partnership.leftPersonId, partnership.rightPersonId],
      });
    }
  }
  for (const solo of graph.soloParentByPersonId.values()) {
    const parentPos = positionByPerson.get(solo.personId);
    if (!parentPos) continue;
    for (const childId of solo.childrenIds) {
      if (seenChildren.has(childId)) continue;
      const childPos = positionByPerson.get(childId);
      if (!childPos) continue;
      seenChildren.add(childId);
      parentChild.push({
        id: `${childId}-parent-child`,
        childId,
        childPos,
        unionPos: parentPos,
        parentIds: [solo.personId],
      });
    }
  }

  return { partnerships, parentChild };
}

export type { Relationship };
