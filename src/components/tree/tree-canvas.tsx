"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
} from "@xyflow/react";
import { RectangleHorizontalIcon, RectangleVerticalIcon } from "lucide-react";
import "@xyflow/react/dist/style.css";
import type { TreeLayoutGraph } from "@/domain/tree/tree-layout.builder";
import { toReactFlow, type PersonFlowNode } from "./adapters/xyflow-adapter";
import { PersonNode } from "./person-node";
import { RelationshipEdge } from "./relationship-edge";
import { useTreeCardStyle } from "./use-tree-card-style";

const nodeTypes = { person: PersonNode };
const edgeTypes = {
  parentChild: RelationshipEdge,
  partnership: RelationshipEdge,
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
}: {
  graph: TreeLayoutGraph;
  familyId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cardStyle, setCardStyle] = useTreeCardStyle();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => toReactFlow(graph, familyId, cardStyle),
    [graph, familyId, cardStyle],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // toReactFlow's output only feeds useNodesState's initial value — swapping
  // cardStyle after mount needs an explicit sync, same reason any derived-
  // from-props state does under React's "state initializers only run once" rule.
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

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
    <div className="h-[70vh] w-full overflow-hidden rounded-lg border border-border">
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
        {/* Default xyflow control buttons are 26px/12px-icon — a fine
            pointer target on desktop but too small to comfortably tap.
            Bumped up on coarse/touch pointers only (phones, tablets),
            matching the pointer-fine gate the minimap uses below — width
            alone isn't a reliable "mobile" signal (a landscape phone can
            exceed md). */}
        <Controls
          showInteractive={false}
          className="pointer-coarse:[&_.react-flow__controls-button]:size-11 pointer-coarse:[&_.react-flow__controls-button_svg]:max-h-5! pointer-coarse:[&_.react-flow__controls-button_svg]:max-w-5!"
        >
          <ControlButton
            onClick={() =>
              setCardStyle(cardStyle === "compact" ? "portrait" : "compact")
            }
            title={
              cardStyle === "compact"
                ? "Показывать карточки с крупным фото"
                : "Показывать компактные карточки"
            }
            aria-pressed={cardStyle === "portrait"}
          >
            {/* Icon shows the shape of the card you'll SWITCH TO, not the
                current one — same convention as a play/pause toggle. A
                horizontal rectangle reads as "wide compact row", a vertical
                one as "tall portrait photo card". fill-none is required: the
                zoom/fitview buttons' own icons are solid shapes styled via
                XYFlow's `.react-flow__controls-button svg { fill: currentColor }`
                rule, which — since a CSS fill declaration beats an SVG
                presentation attribute — would otherwise turn these lucide
                icons into solid blobs instead of the thin-line outline every
                other icon button in this app uses. */}
            {cardStyle === "compact" ? (
              <RectangleVerticalIcon className="fill-none!" />
            ) : (
              <RectangleHorizontalIcon className="fill-none!" />
            )}
          </ControlButton>
        </Controls>
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
