"use client";

import { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  type NodeTypes,
  type EdgeTypes,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildTreeV3Layout } from "@/domain/tree-v3/layout";
import type { FamilyGraph } from "@/domain/tree-v3/types";
import { PersonNode, type PersonFlowNode } from "./person-node";
import { PartnershipEdge } from "./partnership-edge";
import { ParentChildEdge } from "./parent-child-edge";
import { buildReactFlowGraph, buildEdgesFromPositions } from "./react-flow-adapter";
import { CARD_HALF_WIDTH, CARD_HALF_HEIGHT } from "./card-geometry";

const nodeTypes: NodeTypes = { person: PersonNode };
const edgeTypes: EdgeTypes = {
  partnership: PartnershipEdge,
  "parent-child": ParentChildEdge,
};

/**
 * tree-v3 — canvas: React Flow остаётся ТОЛЬКО рендерингом/pan/zoom/
 * interaction (§29) — вся генеалогическая семантика (кто чей родитель,
 * paternal/maternal направление, subtree measurement, коллизии) уже решена
 * в src/domain/tree-v3 ДО того, как компонент вообще получает данные;
 * buildTreeV3Layout здесь — единственный вызов domain-пайплайна (§45),
 * buildReactFlowGraph — единственное место конвертации в xyflow-формат (§48).
 *
 * Тонкая обёртка: пересоздаёт внутренний TreeCanvasInner (со всем draggable-
 * состоянием) через key={focusPersonId} при смене графа — официальный React-
 * паттерн "сброс состояния при смене входных данных" вместо useEffect+
 * setState (react-hooks/set-state-in-effect), нужен только на случай, если
 * graph/focusPersonId когда-нибудь станут динамическими (сейчас — нет, но
 * компонент общий, не должен молча копить стейт чужого графа).
 */
export function TreeCanvas({ graph, focusPersonId }: { graph: FamilyGraph; focusPersonId: string }) {
  return <TreeCanvasInner key={focusPersonId} graph={graph} focusPersonId={focusPersonId} />;
}

/**
 * Карточки — draggable (product feedback: "сделай карточки drag"). Узлы
 * держатся в локальном React-состоянии (не пересоздаются заново из layout
 * на каждый рендер, иначе перетащенная позиция сбрасывалась бы) — edges
 * пересчитываются из ТЕКУЩИХ позиций через buildEdgesFromPositions при
 * каждом onNodesChange, так что линии всегда следуют за карточкой во время
 * drag, а не остаются на исходном domain-месте.
 */
function TreeCanvasInner({ graph, focusPersonId }: { graph: FamilyGraph; focusPersonId: string }) {
  const initial = useMemo(() => {
    const layout = buildTreeV3Layout(graph, focusPersonId);
    return buildReactFlowGraph(layout);
  }, [graph, focusPersonId]);

  const [nodes, setNodes] = useState<PersonFlowNode[]>(initial.nodes);

  const edges = useMemo(() => {
    const centerById = new Map(
      nodes.map((n) => [n.id, { x: n.position.x + CARD_HALF_WIDTH, y: n.position.y + CARD_HALF_HEIGHT }]),
    );
    return buildEdgesFromPositions(centerById, initial.relationInfo);
  }, [nodes, initial.relationInfo]);

  const handleNodesChange = (changes: NodeChange<PersonFlowNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  };

  return (
    <div className="h-dvh w-dvw bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        nodesDraggable
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
