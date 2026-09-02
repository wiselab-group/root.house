"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type NodeTypes,
  type EdgeTypes,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildTreeLayout } from "@/domain/tree-v2/layout";
import type { FamilyGraph } from "@/domain/tree-v2/types";
import { PersonNode, type PersonFlowNode } from "./person-node";
import { SpouseEdge } from "./spouse-edge";
import { ParentChildEdge } from "./parent-child-edge";
import { CARD_HALF_SIZE } from "./card-geometry";

const nodeTypes: NodeTypes = { person: PersonNode };
const edgeTypes: EdgeTypes = {
  spouse: SpouseEdge,
  "parent-child": ParentChildEdge,
};

/**
 * tree-v2 — минимальный canvas с нуля. Пока рисует только layout из
 * buildTreeLayout (сейчас — единственная фокус-персона в центре). Никаких
 * edges, фильтров, trace-панелей: это база, на которую пополнение
 * родственниками будет наращиваться шаг за шагом.
 */
export function TreeCanvas({
  graph,
  focusPersonId,
}: {
  graph: FamilyGraph;
  focusPersonId: string;
}) {
  const layout = useMemo(
    () => buildTreeLayout(graph, focusPersonId),
    [graph, focusPersonId],
  );

  // buildTreeLayout возвращает координаты ЦЕНТРА каждой карточки (удобно
  // для центрирования пар/детей в самом layout-алгоритме) — а xyflow
  // ожидает position как левый верхний угол. Конвертируем один раз здесь;
  // всё остальное (edges) продолжает работать в естественном center-space.
  const nodes: PersonFlowNode[] = layout.persons.map((p) => ({
    id: p.id,
    type: "person",
    position: { x: p.x - CARD_HALF_SIZE, y: p.y - CARD_HALF_SIZE },
    data: { ...p, isFocus: p.id === focusPersonId },
  }));

  const centerById = new Map(
    layout.persons.map((p) => [p.id, { x: p.x, y: p.y }]),
  );

  // Направление source/target зависит от того, кто фактически левее на
  // холсте (layout может расставить супругов в любом порядке), а не от
  // порядка from/to в исходных данных relationship.
  const spouseEdges: Edge[] = layout.relationships
    .filter((r) => r.kind === "spouse")
    .map((r) => {
      const fromCenter = centerById.get(r.from)!;
      const toCenter = centerById.get(r.to)!;
      const fromIsLeft = fromCenter.x <= toCenter.x;
      const [leftId, rightId] = fromIsLeft ? [r.from, r.to] : [r.to, r.from];
      const [leftCenter, rightCenter] = fromIsLeft
        ? [fromCenter, toCenter]
        : [toCenter, fromCenter];
      return {
        id: r.id,
        type: "spouse",
        source: leftId,
        target: rightId,
        sourceHandle: "right",
        targetHandle: "left",
        // Линия рисуется между внутренними краями карточек (край,
        // обращённый друг к другу), не от handle-геометрии xyflow —
        // та же причина, что и у parent-child edge (см. комментарий ниже).
        data: {
          leftX: leftCenter.x + CARD_HALF_SIZE,
          leftY: leftCenter.y,
          rightX: rightCenter.x - CARD_HALF_SIZE,
          rightY: rightCenter.y,
        },
      };
    });

  // Несколько parent-child записей к одному ребёнку (один на родителя)
  // схлопываются в одну линию, стартующую от середины между родителями —
  // T-образное соединение из центра пары, а не из-под одного из них.
  const childToParents = new Map<string, string[]>();
  for (const r of layout.relationships) {
    if (r.kind !== "parent-child") continue;
    if (!childToParents.has(r.to)) childToParents.set(r.to, []);
    childToParents.get(r.to)!.push(r.from);
  }

  const parentChildEdges: Edge[] = [...childToParents.entries()].map(
    ([childId, parentIds]) => {
      const parentCenters = parentIds.map((id) => centerById.get(id)!);
      // Середина отрезка между супругами — и по X, и по Y (карточки супругов
      // стоят на одной высоте, так что unionY совпадает с их общим y, но
      // считаем явно, а не берём Y случайно выбранного source-родителя).
      const xs = parentCenters.map((p) => p.x);
      const ys = parentCenters.map((p) => p.y);
      const unionX = (Math.min(...xs) + Math.max(...xs)) / 2;
      const unionY = ys[0];
      const childCenter = centerById.get(childId)!;
      // xyflow всё равно требует реального узла как source — берём любого
      // из родителей чисто для якоря; геометрия линии ниже полностью
      // игнорирует source/targetX/Y от xyflow (их дают default-handles,
      // которые CSS-transform'ом сидят на 3px внутрь от реальной границы
      // карточки — из-за этого линия не дотягивалась до края) и вместо
      // этого использует unionX/unionY/childX/childY, посчитанные из
      // тех же самых center-координат, что и позиции карточек.
      const sourceId = parentIds[0];
      return {
        id: `${childId}-parent-child`,
        type: "parent-child",
        source: sourceId,
        target: childId,
        sourceHandle: "bottom",
        targetHandle: "top",
        data: { unionX, unionY, childX: childCenter.x, childY: childCenter.y },
      };
    },
  );

  const edges: Edge[] = [...spouseEdges, ...parentChildEdges];

  return (
    <div className="h-dvh w-dvw bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
