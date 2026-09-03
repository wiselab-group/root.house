"use client";

import { useMemo } from "react";
import { ReactFlow, Background, Controls, type NodeTypes, type EdgeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildTreeV3Layout } from "@/domain/tree-v3/layout";
import type { FamilyGraph } from "@/domain/tree-v3/types";
import { PersonNode } from "./person-node";
import { PartnershipEdge } from "./partnership-edge";
import { ParentChildEdge } from "./parent-child-edge";
import { buildReactFlowGraph } from "./react-flow-adapter";

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
 */
export function TreeCanvas({ graph, focusPersonId }: { graph: FamilyGraph; focusPersonId: string }) {
  const { nodes, edges } = useMemo(() => {
    const layout = buildTreeV3Layout(graph, focusPersonId);
    return buildReactFlowGraph(layout);
  }, [graph, focusPersonId]);

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
