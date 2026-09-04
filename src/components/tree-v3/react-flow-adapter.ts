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
 *
 * Карточки — draggable (§ product feedback: "сделай карточки drag"): узлы
 * держатся в React-состоянии (см. tree-canvas.tsx useNodesState), а edges
 * пересчитываются из ТЕКУЩИХ (возможно, перетащенных пользователем) позиций
 * узлов через buildEdgesFromPositions — а не остаются "заморожены" на
 * исходных domain-координатах, иначе линии отставали бы от карточки при
 * drag.
 */
export function buildReactFlowGraph(
  layout: TreeLayoutResult,
): { nodes: PersonFlowNode[]; edges: Edge[]; relationInfo: RelationInfo } {
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
  const relationInfo = buildRelationInfo(layout);
  const edges = buildEdgesFromPositions(centerById, relationInfo);

  return { nodes, edges, relationInfo };
}

/**
 * Структурная (не координатная) часть графа отношений — partnerships и
 * parent→children группировка — не меняется при drag, только позиции. Считаем
 * её один раз из layout, а buildEdgesFromPositions вызывается заново на
 * каждое изменение позиций узлов (см. tree-canvas.tsx).
 */
export interface RelationInfo {
  partnerships: { id: string; leftPersonId: string; rightPersonId: string }[];
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
    })),
    childToParentIds,
    partnershipIdByPair,
  };
}

/**
 * Пересчитывает все edges (partnership + parent-child) из ТЕКУЩИХ центров
 * карточек (centerById) — вызывается и один раз при первой сборке layout'а, и
 * заново при каждом drag-изменении позиции узла (tree-canvas.tsx), чтобы
 * линии всегда шли от реального текущего положения карточек, а не от
 * "замороженных" исходных domain-координат.
 */
export function buildEdgesFromPositions(
  centerById: Map<string, { x: number; y: number }>,
  relationInfo: RelationInfo,
): Edge[] {
  const partnershipEdges: Edge[] = relationInfo.partnerships.flatMap((partnership) => {
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
        // Линия рисуется между внутренними краями карточек, не от handle-
        // геометрии xyflow (см. person-node.tsx комментарий).
        data: {
          leftX: leftCenter.x + CARD_HALF_WIDTH,
          leftY: leftCenter.y,
          rightX: rightCenter.x - CARD_HALF_WIDTH,
          rightY: rightCenter.y,
        },
      },
    ];
  });

  // Junction — середина между текущими (возможно, перетащенными) позициями
  // обоих партнёров, а не зафиксированная domain-координата — при drag
  // одного из супругов сама T-образная точка съезжает вместе с ним, и линия
  // к детям остаётся корректной серединой, а не "застывает" на старом месте.
  // y тоже усредняется (не берётся от одного leftCenter) — иначе при вертикальном
  // drag одного из партнёров пунктирная линия наклоняется, а trunk-junction
  // остаётся на исходном Y и отрывается от пунктира (репро: подвинуть карточку
  // по вертикали — сплошная линия к детям смещалась относительно пунктира).
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

  // Каждый ребёнок получает РОВНО одну parent-child линию (§17/§21) — от
  // partnership junction (посчитанного в placement.ts, §16: технический
  // junction, не отдельная Person-карточка) либо от единственного known
  // родителя (solo parent, §32).
  const parentChildEdges: Edge[] = [];
  for (const [childId, parentIds] of relationInfo.childToParentIds) {
    const childCenter = centerById.get(childId);
    if (!childCenter) continue;

    let unionCenter: { x: number; y: number } | undefined;
    if (parentIds.length === 2) {
      const partnershipId = relationInfo.partnershipIdByPair.get(pairKey(parentIds[0], parentIds[1]));
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

  return [...partnershipEdges, ...parentChildEdges];
}

function pairKey(aId: string, bId: string): string {
  return aId <= bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}
