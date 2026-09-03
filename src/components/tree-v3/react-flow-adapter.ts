import type { Edge } from "@xyflow/react";
import type { TreeLayoutResult } from "@/domain/tree-v3/types";
import { CARD_HALF_WIDTH, CARD_HALF_HEIGHT } from "./card-geometry";
import type { PersonFlowNode } from "./person-node";

/**
 * tree-v3 — единственное место, где TreeLayoutResult (domain, §48: не знает
 * о React) превращается в React Flow nodes/edges. Держит адаптер тонким:
 * геометрия SVG-путей самих edges остаётся в parent-child-edge.tsx/
 * partnership-edge.tsx (получают уже готовые координаты через data), здесь
 * только маппинг domain-объектов → xyflow-объекты.
 */
export function buildReactFlowGraph(
  layout: TreeLayoutResult,
): { nodes: PersonFlowNode[]; edges: Edge[] } {
  // buildTreeV3Layout возвращает координаты ЦЕНТРА каждой карточки (удобно
  // для центрирования пар/детей в самом layout-алгоритме) — а xyflow ожидает
  // position как левый верхний угол. Конвертируем один раз здесь; вся
  // остальная геометрия (edges) продолжает работать в center-space.
  const nodes: PersonFlowNode[] = layout.persons.map((p) => ({
    id: p.id,
    type: "person",
    position: { x: p.x - CARD_HALF_WIDTH, y: p.y - CARD_HALF_HEIGHT },
    data: { person: p, isFocus: p.id === layout.focusPersonId },
  }));

  const centerById = new Map(layout.persons.map((p) => [p.id, { x: p.x, y: p.y }]));

  const partnershipEdges: Edge[] = layout.partnerships.map((partnership) => {
    const leftCenter = centerById.get(partnership.leftPersonId)!;
    const rightCenter = centerById.get(partnership.rightPersonId)!;
    return {
      id: partnership.id,
      type: "partnership",
      source: partnership.leftPersonId,
      target: partnership.rightPersonId,
      sourceHandle: "right",
      targetHandle: "left",
      // Линия рисуется между внутренними краями карточек, не от handle-
      // геометрии xyflow (см. person-node.tsx комментарий).
      data: {
        leftX: leftCenter.x + CARD_HALF_WIDTH,
        leftY: leftCenter.y,
        rightX: rightCenter.x - CARD_HALF_WIDTH,
        rightY: rightCenter.y,
      },
    };
  });

  // Каждый ребёнок получает РОВНО одну parent-child линию (§17/§21) — от
  // partnership junction (посчитанного в placement.ts, §16: технический
  // junction, не отдельная Person-карточка) либо от единственного known
  // родителя (solo parent, §32).
  const childToParentIds = new Map<string, string[]>();
  for (const rel of layout.relationships) {
    if (rel.kind !== "parent-child") continue;
    if (!childToParentIds.has(rel.to)) childToParentIds.set(rel.to, []);
    childToParentIds.get(rel.to)!.push(rel.from);
  }

  const junctionByPartnershipId = new Map(
    layout.partnerships.map((p) => [p.id, { x: p.x, y: p.y }]),
  );
  const partnershipIdByPair = new Map<string, string>();
  for (const p of layout.partnerships) {
    partnershipIdByPair.set(pairKey(p.leftPersonId, p.rightPersonId), p.id);
  }

  const parentChildEdges: Edge[] = [];
  for (const [childId, parentIds] of childToParentIds) {
    const childCenter = centerById.get(childId);
    if (!childCenter) continue;

    let unionCenter: { x: number; y: number } | undefined;
    if (parentIds.length === 2) {
      const partnershipId = partnershipIdByPair.get(pairKey(parentIds[0], parentIds[1]));
      unionCenter = partnershipId ? junctionByPartnershipId.get(partnershipId) : undefined;
    }
    if (!unionCenter) {
      // Solo parent (второй родитель не в графе, §32) — union это сам родитель.
      unionCenter = centerById.get(parentIds[0]);
    }
    if (!unionCenter) continue;

    parentChildEdges.push({
      id: `${childId}-parent-child`,
      type: "parent-child",
      source: parentIds[0],
      target: childId,
      sourceHandle: "bottom",
      targetHandle: "top",
      data: {
        unionX: unionCenter.x,
        unionY: unionCenter.y,
        childX: childCenter.x,
        childY: childCenter.y,
      },
    });
  }

  return { nodes, edges: [...partnershipEdges, ...parentChildEdges] };
}

function pairKey(aId: string, bId: string): string {
  return aId <= bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}
