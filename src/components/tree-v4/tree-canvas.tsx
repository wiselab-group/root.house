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
import { buildTreeV4Layout } from "@/domain/tree-v4/layout";
import type { FamilyGraph } from "@/domain/tree-v4/types";
import { PersonNode, type PersonFlowNode } from "./person-node";
import { PartnershipEdge } from "./partnership-edge";
import { ParentChildEdge } from "./parent-child-edge";
import {
  buildReactFlowGraph,
  buildEdgesFromPositions,
} from "./react-flow-adapter";
import { CARD_HALF_WIDTH, CARD_HALF_HEIGHT } from "./card-geometry";

const nodeTypes: NodeTypes = { person: PersonNode };
const edgeTypes: EdgeTypes = {
  partnership: PartnershipEdge,
  "parent-child": ParentChildEdge,
};

/**
 * tree-v4 — canvas. React Flow is responsible ONLY for rendering/pan/zoom/
 * selection/viewport; all genealogy semantics (who is whose parent,
 * paternal/maternal direction, subtree measurement, collision avoidance) is
 * already resolved in src/domain/tree-v4 before this component ever sees
 * the data. buildTreeV4Layout is the single domain pipeline call;
 * buildReactFlowGraph is the single xyflow-conversion call.
 *
 * Thin wrapper: remounts the stateful inner component via key={focusPersonId}
 * whenever the graph changes — the standard React "reset state on changed
 * input" pattern, in case graph/focusPersonId ever become dynamic (they
 * aren't yet, but the component is shared and shouldn't silently accumulate
 * a stale graph's dragged positions).
 */
export function TreeCanvas({
  graph,
  focusPersonId,
}: {
  graph: FamilyGraph;
  focusPersonId: string;
}) {
  return (
    <TreeCanvasInner
      key={focusPersonId}
      graph={graph}
      focusPersonId={focusPersonId}
    />
  );
}

/**
 * Cards are draggable. Nodes are held in local React state (not rebuilt
 * from the layout on every render, or a dragged position would reset) —
 * edges are recomputed from the CURRENT positions via
 * buildEdgesFromPositions on every onNodesChange, so lines always follow
 * the card during drag instead of staying at its original domain position.
 */
function TreeCanvasInner({
  graph,
  focusPersonId,
}: {
  graph: FamilyGraph;
  focusPersonId: string;
}) {
  const initial = useMemo(() => {
    const layout = buildTreeV4Layout(graph, focusPersonId);
    return buildReactFlowGraph(layout);
  }, [graph, focusPersonId]);

  const [nodes, setNodes] = useState<PersonFlowNode[]>(initial.nodes);

  const edges = useMemo(() => {
    const centerById = new Map(
      nodes.map((n) => [
        n.id,
        {
          x: n.position.x + CARD_HALF_WIDTH,
          y: n.position.y + CARD_HALF_HEIGHT,
        },
      ]),
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
