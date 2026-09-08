"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { updateDefaultFocusPersonAction } from "@/actions/family.actions";
import type { TreeLayoutGraph } from "@/domain/tree/tree-layout.builder";
import {
  toReactFlow,
  type TreeHighlightState,
} from "./adapters/xyflow-adapter";
import { PersonNode } from "./person-node";
import { RelationshipEdge } from "./relationship-edge";
import { UnionChildEdge } from "./union-child-edge";
import { useTreeCardStyle } from "./use-tree-card-style";
import { useCoarsePointer } from "./use-coarse-pointer";
import { useHasMounted } from "./use-has-mounted";
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
    setCenter(
      focusNode.position.x + width / 2,
      focusNode.position.y + height / 2,
      {
        zoom: 0.85,
      },
    );
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
  familySlug,
  highlight,
  readOnly = false,
  shareToken,
}: {
  graph: TreeLayoutGraph;
  familyId: string;
  /** The family's URL slug — passed through to node data so each card's click popover can link to /families/[familySlug]/people/[slug]. */
  familySlug: string;
  /** Filter/Focus (tree-filter.ts) + Relationship Trace (tree-trace.ts) state to render — see xyflow-adapter.ts's TreeHighlightState. Omit when neither is active. */
  highlight?: TreeHighlightState;
  /** Anonymous Share Link view (see app/share/[token]/page.tsx) — forces
   *  dragging off, never wires focus-switching (no updateDefaultFocusPersonAction
   *  call, no URL ?focus= navigation — the link shows exactly the tree its
   *  owner configured), and hides the drag-lock control entirely since
   *  there's nothing left for it to toggle. */
  readOnly?: boolean;
  /** The Share Link's own token — required when readOnly, used to build
   *  each card's avatar URL against /api/share/[token]/media/[mediaId]
   *  instead of the auth-gated /api/media/[mediaId] (see
   *  xyflow-adapter.ts::buildPhotoUrl). */
  shareToken?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cardStyle, setCardStyle] = useTreeCardStyle();
  const isCoarsePointer = useCoarsePointer();
  // Global drag lock — starts LOCKED (false): cards are meant to stay put at
  // their computed layout position, dragging is an opt-in "let me nudge this
  // one card" mode the lock button in TreeCardStyleControl toggles. Plain
  // session state (not persisted like cardStyle) — every visit re-opens
  // locked, matching the layout the server just computed. Deliberately does
  // NOT also gate elementsSelectable: a card's click-to-open-popover
  // ("Посмотреть профиль"/"Сделать фокус-персоной", see person-node.tsx) is
  // a plain PopoverTrigger, not XYFlow's own node-selection UI — locking
  // elementsSelectable to this same state was blocking that click,
  // silently disabling the popover while drag was locked, which had no
  // relation to dragging at all.
  const [nodesDraggable, setNodesDraggable] = useState(false);

  // XYFlow's own <MiniMap> picks its shapeRendering attribute from
  // `typeof window === 'undefined' || !!window.chrome` at render time (see
  // @xyflow/react's MiniMap source) — on the server that's always
  // "crispEdges" (no window), but a non-Chrome browser's first client
  // render computes "geometricPrecision" instead, a guaranteed hydration
  // mismatch this component has no way to control since the check lives
  // inside the library. Mounting MiniMap only after hydration (empty on the
  // server, appended client-side once mounted) sidesteps it — the minimap
  // briefly not being there for one paint is invisible in practice.
  const mounted = useHasMounted();

  const setFocus = useCallback(
    (personId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("focus", personId);
      router.push(`${pathname}?${params.toString()}`);
      // Persists as this user's own "tree opens focused on" default (Family
      // Settings' FamilyFocusSettings, same server action it calls) — a
      // deliberate "сделать фокус-персоной" click means "this is who I want
      // to see when I come back", not just a one-off navigation, so it
      // should stick past this session too. Fire-and-forget: the URL
      // navigation above is the action's own immediate, visible effect;
      // this save trails it and has nothing useful to block on.
      void updateDefaultFocusPersonAction(familyId, personId);
    },
    [familyId, pathname, router, searchParams],
  );

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      toReactFlow(
        graph,
        familyId,
        familySlug,
        cardStyle,
        highlight,
        setFocus,
        readOnly,
        shareToken,
      ),
    [
      graph,
      familyId,
      familySlug,
      cardStyle,
      highlight,
      setFocus,
      readOnly,
      shareToken,
    ],
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

  const focusNode = nodes.find((node) => node.id === graph.focusPersonId);

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
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={!readOnly && nodesDraggable}
        nodesConnectable={!readOnly && nodesDraggable}
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
        // onlyRenderVisibleElements used to be enabled here (mounts only
        // nodes/edges intersecting the current viewport, capping DOM cost on
        // a large family regardless of zoom/pan — added after a pinch-zoom-
        // out on a 30-100 person family, each a full PersonNode with a
        // photo, crashed a phone Safari tab). Turned back OFF: XYFlow decides
        // per-edge visibility from source/target node positions alone, with
        // no notion of UnionChildEdge/PartnershipEdgeLine's own custom
        // T-shaped geometry (both read LIVE positions via useInternalNode,
        // not sourceX/targetX) — a card leaving and re-entering the viewport
        // got remounted a beat before its measured size settled, so its
        // union trunk/partnership line would render one frame with visibly
        // offset connectors (reported: lines "съехали" after a drag that
        // took a card off-screen and back). Losing this optimization
        // reopens the phone-crash risk on very large families — if that
        // resurfaces, the fix belongs in the edge components themselves
        // (stop trusting a stale `measured` fallback mid-remount), not in
        // silently re-enabling this flag.
      >
        <InitialFocusViewport focusNode={focusNode} />
        <Background gap={24} />
        {readOnly ? (
          // No drag-lock toggle to show (dragging is force-disabled above);
          // card style (compact/portrait) is still a harmless viewing
          // preference, offered without the drag control.
          <TreeCardStyleControl
            cardStyle={cardStyle}
            setCardStyle={setCardStyle}
            showZoom={!isCoarsePointer}
          />
        ) : (
          <TreeCardStyleControl
            cardStyle={cardStyle}
            setCardStyle={setCardStyle}
            draggable={nodesDraggable}
            setDraggable={setNodesDraggable}
            showZoom={!isCoarsePointer}
          />
        )}
        {/* Minimap needs room to read as a map, not a smudge — skip it below
            md where the canvas itself is already cramped (plan §6/§13), and
            skip it on any touch/coarse-pointer device regardless of width:
            a landscape phone can exceed the md breakpoint but is still a
            phone, and a tiny floating minimap there is more clutter than a
            map. pointer-fine (mouse/trackpad) is the actual "desktop"
            signal, not viewport width alone. */}
        {mounted && (
          <MiniMap
            pannable
            zoomable
            className="hidden bg-card! md:pointer-fine:block"
          />
        )}
      </ReactFlow>
    </div>
  );
}
