"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
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

/** The tree always opens centered on the focus person at a fixed 85% zoom
 * — not fitView's "whatever fits the whole connected family" framing —
 * so opening the tree reliably lands on "here's the person I asked for",
 * regardless of how large or lopsided the rest of the family graph is.
 * Rendered as a child of <ReactFlow> (not a sibling) specifically so
 * useReactFlow resolves against this flow instance's own provider, which
 * <ReactFlow> sets up internally for its children — no separate
 * <ReactFlowProvider> needed. */
function InitialFocusViewport({ focusNode }: { focusNode: Node | undefined }) {
  const { setCenter } = useReactFlow();

  useEffect(() => {
    if (!focusNode) return;
    // Prefer `measured` (XYFlow's own ResizeObserver reading of the actual
    // rendered DOM node) over the static width/height passed into
    // toReactFlow's NODE_DIMENSIONS — that static height in particular is
    // only an estimate (CompactCardBody's real height depends on its text
    // content, not a fixed CSS height), so centering against it instead of
    // the real box put the focus card visibly off-center vertically.
    const width = focusNode.measured?.width ?? focusNode.width ?? 0;
    const height = focusNode.measured?.height ?? focusNode.height ?? 0;
    setCenter(focusNode.position.x + width / 2, focusNode.position.y + height / 2, {
      zoom: 0.85,
    });
    // Re-centers whenever the focus person itself changes (URL ?focus=...
    // navigation) — NOT on every node reposition (card style toggle,
    // filter/trace highlight), which would fight the user's own pan/zoom
    // mid-session. focusNode's identity change (a new id) is what signals
    // "the user asked to jump to someone else", not a mere prop update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNode?.id, setCenter]);

  return null;
}

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

  const focusNode = nodes.find((node) => node.id === graph.focusPersonId);

  return (
    // Full-bleed, near-full-height on every viewport — a bordered, inset
    // canvas at a fixed 70vh left most of a real family's tree lost in a
    // sea of empty background (a small tree at "70vh inside a max-w-5xl
    // column" reads as adrift, not "here's my family"). Matches the
    // full-bleed treatment mobile already had; the page (FamilyTreePage)
    // drops its own max-width/padding around this element so nothing
    // constrains it from the outside either.
    //
    // contain: layout/size — this box's own height is a fixed calc(), it
    // never actually needs to be recomputed from outside. Without this, the
    // mobile header's menu panel expanding in normal flow (see
    // MobileHeaderPanel's grid-template-rows animation) pushes this element
    // down the page every animation frame; that's fine (a taller header is
    // expected to shove the canvas below it), but browsers don't know this
    // box's own layout can't be affected by that reflow, so they were
    // re-measuring it — and XYFlow's own ResizeObserver reacts to every one
    // of those measurements. On a family tree with no depth cap
    // (ancestorGenerations/descendantGenerations: Infinity, see the tree
    // page) that was enough sustained layout thrash on a phone to crash the
    // Safari tab after a tap or two on the burger ("a problem repeatedly
    // occurred"). `contain` tells the browser this subtree's layout is
    // self-contained, so moving the box no longer re-triggers work inside
    // it.
    <div className="h-[calc(100svh-4.5rem)] w-full overflow-hidden contain-[layout_size]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        proOptions={{ hideAttribution: true }}
        // No fitView here — InitialFocusViewport below centers on the focus
        // person at a fixed 85% zoom instead (per the family's "opens with
        // focus on" setting), so opening the tree always lands on the
        // requested person regardless of how large or lopsided the rest of
        // the connected family graph is. minZoom stays low enough that a
        // large family (page.tsx passes ancestorGenerations/
        // descendantGenerations: Infinity) can still be zoomed/panned out
        // to see everyone from there.
        minZoom={0.02}
        maxZoom={1.5}
      >
        <InitialFocusViewport focusNode={focusNode} />
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
