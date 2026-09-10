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
  buildClientTreeLayout,
  type TreeClientGraphPayload,
} from "@/domain/tree/tree-adapter";
import {
  toReactFlow,
  type TreeHighlightState,
} from "./adapters/xyflow-adapter";
import { PersonNode } from "./person-node";
import { RelationshipEdge } from "./relationship-edge";
import { UnionChildEdge } from "./union-child-edge";
import { useTreeCardStyle, type TreeCardStyle } from "./use-tree-card-style";
import { useCoarsePointer } from "./use-coarse-pointer";
import { useReducedMotion } from "./use-reduced-motion";
import { useHasMounted } from "./use-has-mounted";
import { TreeCardStyleControl } from "./tree-card-style-control";
import { useCollapsedBranches } from "./use-collapsed-branches";
import {
  pruneCollapsedDescendants,
  personIdsWithChildren,
} from "./prune-collapsed";
import { TreeLayoutPositionsProvider } from "./tree-layout-positions-context";

const nodeTypes = { person: PersonNode };
const edgeTypes = {
  parentChild: RelationshipEdge,
  partnership: RelationshipEdge,
  unionChild: UnionChildEdge,
};

/**
 * The tree always centers on the focus person at a fixed 85% zoom — not
 * fitView's "whatever fits the whole connected family" framing — so landing
 * on the focus person is reliable regardless of how large or lopsided the
 * rest of the family graph is. Rendered as a child of <ReactFlow> (not a
 * sibling) specifically so useReactFlow resolves against this flow
 * instance's own provider, which <ReactFlow> sets up internally for its
 * children — no separate <ReactFlowProvider> needed.
 *
 * Handles BOTH the tree's initial load AND every subsequent focus switch
 * (rewrite plan §7 Stage 7: TreeCanvas's own setFocus, client-side, no page
 * reload) — the same "re-center on the new focus" behavior either way, just
 * animated (a smooth pan/zoom, `ANIMATION_DURATION_MS`) once the tree is
 * already interactive, vs. instant on the very first paint (nothing to
 * animate FROM yet).
 */
const FOCUS_SWITCH_ANIMATION_MS = 500;

function FocusViewport({
  focusNode,
  isInitialLoad,
}: {
  focusNode: Node | undefined;
  /** True only for the very first render — an instant jump, not an animated pan, since there's no previous viewport position to animate FROM yet. */
  isInitialLoad: boolean;
}) {
  const { setCenter } = useReactFlow();
  const reducedMotion = useReducedMotion();

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
        // CLAUDE.md ANIMATION RULES: always a prefers-reduced-motion
        // fallback — an instant jump (duration omitted) instead of the
        // animated pan/zoom. isInitialLoad is checked too since animating
        // the very FIRST paint (from wherever XYFlow's default viewport
        // happens to be) would read as a jarring unrequested pan on page
        // load, not a deliberate focus-switch transition.
        duration:
          isInitialLoad || reducedMotion ? undefined : FOCUS_SWITCH_ANIMATION_MS,
      },
    );
    // Re-centers whenever the focus person itself changes (URL ?focus=...
    // navigation, or TreeCanvas's own client-side setFocus) — NOT on every
    // node reposition (card style toggle, filter/trace highlight), which
    // would fight the user's own pan/zoom mid-session. focusNode's identity
    // change (a new id) is what signals "the user asked to jump to someone
    // else", not a mere prop update.
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
 * <ReactFlow> for the same provider-scoping reason as FocusViewport above.
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
  rawGraph,
  familyId,
  familySlug,
  highlight,
  readOnly = false,
  shareToken,
}: {
  graph: TreeLayoutGraph;
  /**
   * Rewrite plan §7 Stage 7 — the client-safe raw graph (getRawTreeGraph),
   * used ONLY to re-run buildTreeLayout locally when the user switches
   * focus (see setFocus below), replacing the old full-page-reload
   * navigation. Undefined in read-only (Share Link) mode, which never
   * wires focus-switching at all (see readOnly's own doc comment) — no
   * client bundle cost for the whole layout engine on that surface.
   */
  rawGraph?: TreeClientGraphPayload;
  familyId: string;
  /** The family's URL slug — passed through to node data so each card's click popover can link to /families/[familySlug]/people/[slug]. */
  familySlug: string;
  /** Filter/Focus (tree-filter.ts) + Relationship Trace (tree-trace.ts) state to render — see xyflow-adapter.ts's TreeHighlightState. Omit when neither is active. Reused as-is across a client-side re-focus (rewrite plan §7 Stage 7): filterMatchedIds/tracePersonIds/traceEdgeIds are person/edge ID sets, not position-dependent, and buildTreeLayout always lays out the SAME full connected family regardless of which person is the root — so a re-focus never changes who's in these sets, only where they're drawn. */
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
  // FocusViewport reads this to skip animating the tree's OWN initial paint
  // (nothing to pan/zoom FROM yet, see its own doc comment) — `!mounted` is
  // true for SSR and the very first client render, flipping permanently
  // false once hydration completes (useHasMounted's own
  // useSyncExternalStore, not a ref/effect — see that hook's doc comment
  // for why: reading a ref during render, or setState synchronously inside
  // an effect body, both trip React's own lint rules against exactly that).
  const isInitialLoad = !mounted;

  // Client-side focus switch (rewrite plan §7 Stage 7) — replaces the old
  // full-page-reload navigation. `null` means "render the server-provided
  // `graph` prop as-is" (the common case: initial load, or after any
  // server navigation that changes `graph` itself — filter/trace changes,
  // a direct ?focus= link click from outside the canvas). Once set,
  // `clientGraph` takes over rendering until either another client-side
  // re-focus replaces it again, or a NEW `graph` prop arrives and
  // supersedes it.
  const [clientGraph, setClientGraph] = useState<TreeLayoutGraph | null>(
    null,
  );
  // A fresh `graph` prop (server navigation — filter/trace toggled, or the
  // browser back/forward button landing on a different ?focus=) always wins
  // over a stale client-computed graph from a PREVIOUS focus person; without
  // this, clicking "назад" after several client-side re-focuses would keep
  // showing the last client-computed layout instead of the server's own.
  // React's own documented "adjusting state when a prop changes" pattern
  // (react.dev/learn/you-might-not-need-an-effect) — comparing during
  // render and calling setState conditionally, rather than in a useEffect
  // (which would cost an extra, visible render cycle showing the STALE
  // clientGraph before the effect can clear it).
  const [prevGraph, setPrevGraph] = useState(graph);
  if (graph !== prevGraph) {
    setPrevGraph(graph);
    setClientGraph(null);
  }

  const setFocus = useCallback(
    (personId: string) => {
      // Persists as this user's own "tree opens focused on" default (Family
      // Settings' FamilyFocusSettings, same server action it calls) — a
      // deliberate "сделать фокус-персоной" click means "this is who I want
      // to see when I come back", not just a one-off navigation, so it
      // should stick past this session too. Fire-and-forget: it has nothing
      // useful to block the (synchronous, local) re-layout below on.
      void updateDefaultFocusPersonAction(familyId, personId);

      // Keeps the URL shareable/bookmarkable (and gives the browser
      // back-button "previous focus" navigation) without triggering a
      // server round-trip: `replace` (not `push`) avoids piling up one
      // history entry per click on a tree someone is casually browsing
      // through several relatives in a row, and `scroll: false` keeps
      // Next.js from resetting window scroll position on a page that has
      // no scroll of its own anyway (the canvas is its own pan/zoom
      // surface). This alone would still cost a server round-trip once
      // Next.js re-renders the Server Component page for the new
      // ?focus= — rawGraph, if present, sidesteps that entirely by
      // recomputing the SAME layout locally instead, synchronously, before
      // that navigation's own response could arrive.
      const params = new URLSearchParams(searchParams.toString());
      params.set("focus", personId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      if (rawGraph) {
        setClientGraph(buildClientTreeLayout(rawGraph, personId));
      }
    },
    [familyId, pathname, rawGraph, router, searchParams],
  );

  const effectiveGraph = clientGraph ?? graph;

  // Collapse/expand (rewrite plan §7 Stage 5) — purely client-side, ephemeral
  // (see use-collapsed-branches.ts). `effectiveGraph` itself (server-computed
  // or, after a client-side re-focus, buildClientTreeLayout's own output —
  // either way, already-positioned) is never mutated — pruneCollapsedDescendants
  // returns a NEW graph with the collapsed subtrees' nodes/edges filtered
  // out, leaving every remaining node's own x/y exactly as laid out (no
  // FURTHER client-side re-layout on top of that — see prune-collapsed.ts's
  // own doc comment for why). `withChildren` is computed off the FULL graph
  // (before pruning) so a currently-collapsed person's badge doesn't
  // disappear just because their own children are no longer in the pruned
  // edge list.
  const { collapsedIds, toggleCollapse } = useCollapsedBranches();
  const withChildren = useMemo(
    () => personIdsWithChildren(effectiveGraph),
    [effectiveGraph],
  );
  const prunedGraph = useMemo(
    () => pruneCollapsedDescendants(effectiveGraph, collapsedIds),
    [effectiveGraph, collapsedIds],
  );

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      toReactFlow(
        prunedGraph,
        familyId,
        familySlug,
        cardStyle,
        highlight,
        setFocus,
        readOnly,
        shareToken,
        readOnly ? undefined : toggleCollapse,
        withChildren,
      ),
    [
      prunedGraph,
      familyId,
      familySlug,
      cardStyle,
      highlight,
      setFocus,
      readOnly,
      shareToken,
      toggleCollapse,
      withChildren,
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

  const focusNode = nodes.find(
    (node) => node.id === effectiveGraph.focusPersonId,
  );
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
    <TreeLayoutPositionsProvider nodes={nodes}>
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
          // No fitView here — FocusViewport below centers on the focus
          // person at a fixed 85% zoom instead (per the family's "opens with
          // focus on" setting), so opening the tree always lands on the
          // requested person regardless of how large or lopsided the rest of
          // the connected family graph is. minZoom stays low enough that a
          // large family (page.tsx passes ancestorGenerations/
          // descendantGenerations: Infinity) can still be zoomed/panned out
          // to see everyone from there.
          minZoom={0.02}
          maxZoom={1.5}
          // Re-enabled (rewrite plan §7 Stage 6) — mounts only nodes/edges
          // intersecting the current viewport, capping DOM cost on a large
          // family regardless of zoom/pan (previously disabled after a
          // pinch-zoom-out on a 30-100 person family, each a full PersonNode
          // with a photo, crashed a phone Safari tab). Was disabled because
          // RelationshipEdge/UnionChildEdge read LIVE DOM-measured positions
          // via useInternalNode — a card leaving and re-entering the viewport
          // got remounted a beat before its `measured` size settled, drawing a
          // visibly offset/detached connector for however many frames that
          // gap lasted. Both edge components now read from
          // TreeLayoutPositionsContext instead (see its own doc comment) —
          // committed layout positions/dimensions, never a DOM measurement, so
          // there's no stale-`measured` window to hit on remount anymore.
          onlyRenderVisibleElements
        >
          <FocusViewport
            focusNode={focusNode}
            isInitialLoad={isInitialLoad}
          />
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
    </TreeLayoutPositionsProvider>
  );
}
