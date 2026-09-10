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
  useUpdateNodeInternals,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import { updateDefaultFocusPersonAction } from "@/actions/family.actions";
import type { TreeLayoutGraph } from "@/domain/tree/tree-layout.builder";
import {
  toReactFlow,
  type TreeHighlightState,
} from "./adapters/xyflow-adapter";
import { PersonNode } from "./person-node";
import { RelationshipEdge } from "./relationship-edge";
import { UnionChildEdge } from "./union-child-edge";
import { useTreeCardStyle, type TreeCardStyle } from "./use-tree-card-style";
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
 * Forces XYFlow to re-measure every node's DOM box the instant a cardStyle
 * toggle (compact/portrait, see use-tree-card-style.ts) actually changes
 * what's rendered inside each card (CompactCardBody vs PortraitCardBody —
 * person-node.tsx has no fixed card height, it's content-driven, so the two
 * styles paint at genuinely different heights).
 *
 * XYFlow's own `measured` field normally updates via a ResizeObserver, which
 * only fires *after* the browser has painted the new DOM — later than the
 * same React commit that already flipped every node's `data.cardStyle`.
 * RelationshipEdge/UnionChildEdge read `data.cardStyle` (already new) to
 * pick their Y-offset formula (CONNECTOR_CENTER_Y, COMPACT_CHILD_TAIL_LENGTH)
 * but combine it with `measured`/EdgeProps sourceY/targetY (still the old
 * style's box, until that ResizeObserver tick lands) — for however many
 * frames that gap lasts, every connector draws against mismatched geometry:
 * a visibly kinked or detached line. Reported by the user with real-data
 * screenshots — this reproduces reliably, not just as an occasional
 * single-frame flicker, because a fresh XYFlow `nodes` array (the
 * setNodes(initialNodes) effect below) doesn't retain the previous array's
 * `measured` per node the way an in-place mutation would, so the
 * stale-vs-new mismatch can persist past the next paint instead of
 * self-correcting after one frame.
 *
 * `useUpdateNodeInternals` is XYFlow's own documented escape hatch for
 * exactly this — "I changed a node's rendered size/handles myself, remeasure
 * it now" — reading the live DOM element synchronously inside its own
 * requestAnimationFrame (see @xyflow/react's implementation), instead of
 * waiting on the passive ResizeObserver path. Rendered as a child of
 * <ReactFlow> for the same provider-scoping reason as InitialFocusViewport
 * above.
 */
function CardStyleInternalsSync({
  cardStyle,
  nodeIds,
}: {
  cardStyle: TreeCardStyle;
  nodeIds: string[];
}) {
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    // Deferred past the next paint (double requestAnimationFrame, beyond
    // useUpdateNodeInternals' own internal rAF — see its @xyflow/react
    // source) because of WHERE this component sits: it's rendered as a
    // child of <ReactFlow>, which is itself a child of TreeCanvas — and
    // TreeCanvas is what actually calls setNodes(initialNodes) to apply the
    // new cardStyle to every node's data/width/height, in TreeCanvas's OWN
    // separate useEffect. React runs child effects before parent effects on
    // the same commit, so this component's useEffect (child) fires BEFORE
    // TreeCanvas's setNodes effect (parent) even schedules its re-render —
    // meaning updateNodeInternals here was capturing each nodeElement's
    // height from the PREVIOUS cardStyle's DOM (PersonNode hadn't even
    // re-rendered with the new data.cardStyle yet, let alone painted it),
    // not the new one. Real bug the user caught, persisting (not just a
    // single missed frame): the resulting connector edge stayed visibly
    // short/detached from its source card even seconds after the toggle,
    // because nothing ever re-triggered a correct remeasure afterward. One
    // requestAnimationFrame only pushes past THIS effect's own frame, not
    // past setNodes' re-render + browser paint (a state update scheduled
    // from an effect is its own separate render pass, not synchronous
    // within this one) — two nested rAFs is what actually lands after that
    // re-render has committed AND painted, matching what
    // useUpdateNodeInternals' own single rAF assumes is already true when
    // IT calls updateNodeInternals (its own error case, this component
    // exists to prevent).
    let cancelled = false;
    let innerFrame: number | undefined;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        if (!cancelled) updateNodeInternals(nodeIds);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outerFrame);
      if (innerFrame !== undefined) cancelAnimationFrame(innerFrame);
    };
    // Intentionally keyed on cardStyle, not nodeIds' own identity/content —
    // a card style toggle is the only case that needs a forced remeasure;
    // the initial mount and ordinary node-set changes (different focus
    // person, filter/trace highlight) already get correct `measured` values
    // from XYFlow's normal ResizeObserver path with no gap to close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardStyle, updateNodeInternals]);

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
  // Passed to CardStyleInternalsSync below — recomputing this plain array
  // every render is fine, that component's own effect only keys off
  // `cardStyle`, not this array's identity (see its doc comment).
  const nodeIds = nodes.map((node) => node.id);

  return (
    // Full-bleed, near-full-height on every viewport — a bordered, inset
    // canvas at a fixed 70vh left most of a real family's tree lost in a
    // sea of empty background (a small tree at "70vh inside a max-w-5xl
    // column" reads as adrift, not "here's my family"). Matches the
    // full-bleed treatment mobile already had; the page (FamilyTreePage)
    // drops its own max-width/padding around this element so nothing
    // constrains it from the outside either. The 4.5rem subtracted is
    // AppHeader's own height (border-b + px-6 py-3, see app-header.tsx) —
    // only present above this canvas inside the (app) layout, whose own
    // wrapper is a plain block div, so a plain `h-[calc(100svh-4.5rem)]`
    // resolves cleanly there.
    //
    // The anonymous Share Link page (app/share/[token]/page.tsx) renders
    // no header, but its own ancestor chain up to <body> is `flex
    // flex-col` (see app/layout.tsx) — a `height: 100svh` on a plain flex
    // item inside a column flex container measured as 0 there (observed:
    // ReactFlow logged "parent container needs a width and a height" and
    // the tree never painted, even though the exact same class resolves
    // fine for the non-readOnly, non-flex-parented case). `fixed inset-0`
    // sidesteps the whole question by taking this element out of flow
    // entirely and sizing it straight off the viewport, independent of
    // whatever flex/block context its parent happens to be.
    <div
      className={cn(
        "w-full overflow-hidden",
        readOnly ? "fixed inset-0" : "h-[calc(100svh-4.5rem)]",
      )}
    >
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
        <CardStyleInternalsSync cardStyle={cardStyle} nodeIds={nodeIds} />
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
