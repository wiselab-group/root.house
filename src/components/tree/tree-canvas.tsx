"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { TreeLayoutGraph } from "@/domain/tree/tree-layout.builder";
import { toReactFlow, type PersonFlowNode, type TreeHighlightState } from "./adapters/xyflow-adapter";
import { PersonNode } from "./person-node";
import { RelationshipEdge } from "./relationship-edge";
import { UnionChildEdge } from "./union-child-edge";
import { useTreeCardStyle } from "./use-tree-card-style";
import { useCoarsePointer } from "./use-coarse-pointer";
import { TreeCardStyleControl } from "./tree-card-style-control";

const nodeTypes = { person: PersonNode };
const edgeTypes = {
  parentChild: RelationshipEdge,
  partnership: RelationshipEdge,
  unionChild: UnionChildEdge,
};

/**
 * Interactive desktop family tree canvas. `focusPersonId` lives in the URL
 * (?focus=personId) rather than component state — this makes the current
 * view shareable via link and gives the browser back-button "previous
 * focus" navigation for free (per plan §6/§12).
 */
export function TreeCanvas({
  graph,
  familyId,
  highlight,
}: {
  graph: TreeLayoutGraph;
  familyId: string;
  /** Filter/Focus (tree-filter.ts) + Relationship Trace (tree-trace.ts) state to render — see xyflow-adapter.ts's TreeHighlightState. Omit when neither is active. */
  highlight?: TreeHighlightState;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cardStyle, setCardStyle] = useTreeCardStyle();
  const isCoarsePointer = useCoarsePointer();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => toReactFlow(graph, familyId, cardStyle, highlight),
    [graph, familyId, cardStyle, highlight],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // toReactFlow's output only feeds useNodesState/useEdgesState's initial
  // value — any prop change after mount (cardStyle, but also `highlight`
  // when a filter or Relationship Trace selection changes) needs an
  // explicit sync, same reason any derived-from-props state does under
  // React's "state initializers only run once" rule. Missing this on the
  // edges side is why trace highlighting used to update card borders (via
  // this same effect on nodes) but never the connecting lines: initialEdges
  // recomputed on every highlight change, but the edges state itself never
  // picked it back up.
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const setFocus = useCallback(
    (personId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("focus", personId);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const handleNodeClick: NodeMouseHandler<PersonFlowNode> = useCallback(
    (_event, node) => {
      if (node.data.personId !== graph.focusPersonId) {
        setFocus(node.data.personId);
      }
    },
    [graph.focusPersonId, setFocus],
  );

  return (
    // Full-bleed, near-full-height on every viewport — a bordered, inset
    // canvas at a fixed 70vh left most of a real family's tree lost in a
    // sea of empty background (a small tree at "70vh inside a max-w-5xl
    // column" reads as adrift, not "here's my family"). Matches the
    // full-bleed treatment mobile already had; the page (FamilyTreePage)
    // drops its own max-width/padding around this element so nothing
    // constrains it from the outside either.
    <div className="h-[calc(100svh-4.5rem)] w-full overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background gap={24} />
        <TreeCardStyleControl cardStyle={cardStyle} setCardStyle={setCardStyle} showZoom={!isCoarsePointer} />
        {/* Minimap needs room to read as a map, not a smudge — skip it below
            md where the canvas itself is already cramped (plan §6/§13), and
            skip it on any touch/coarse-pointer device regardless of width:
            a landscape phone can exceed the md breakpoint but is still a
            phone, and a tiny floating minimap there is more clutter than a
            map. pointer-fine (mouse/trackpad) is the actual "desktop"
            signal, not viewport width alone. */}
        <MiniMap pannable zoomable className="hidden bg-card! md:pointer-fine:block" />
      </ReactFlow>
    </div>
  );
}
