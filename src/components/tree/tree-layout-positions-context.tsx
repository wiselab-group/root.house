"use client";

import { createContext, useContext, useMemo } from "react";
import type { PersonFlowNode } from "./adapters/xyflow-adapter";
import type { TreeCardStyle } from "./use-tree-card-style";

/**
 * tree-layout-positions-context.tsx — rewrite plan §7 Stage 6
 * (virtualization) / §4.1.
 *
 * RelationshipEdge/UnionChildEdge used to read every node's geometry via
 * XYFlow's own `useInternalNode` — live, DOM-measurement-dependent internal
 * state (`internals.positionAbsolute` + a ResizeObserver-driven `measured`)
 * specifically built for drag: a dragged node's position needs to update
 * every pointer-move frame with no React state round-trip. That's exactly
 * why `onlyRenderVisibleElements` (viewport-based node/edge mounting, capping
 * DOM cost on a large family) was previously tried and reverted: a card
 * leaving and re-entering the viewport gets UNMOUNTED and REMOUNTED by
 * XYFlow's own NodeRenderer, and for a beat after remount `measured` is
 * stale (or the whole internal record briefly inconsistent) before the
 * ResizeObserver fires again — the connector line reads that gap as a
 * genuinely offset/detached line for however many frames it lasts.
 *
 * This context is a second, INDEPENDENT source of the same geometry, built
 * directly from the already-known, non-DOM-dependent values — each node's
 * `position` (x/y, exactly what toReactFlow computed from the layout
 * engine's own LaidOutPerson.x/y, scaled once) and its static `width`/
 * `height` (xyflow-adapter.ts's NODE_DIMENSIONS[cardStyle], the same
 * constant XYFlow itself falls back to before a real DOM measurement
 * exists) — never a DOM measurement, so it can never go stale on
 * unmount/remount. Edges read from HERE by default; only a node the user is
 * ACTIVELY dragging right now needs the live/DOM-measured value (drag must
 * track the pointer every frame, which this context — built from `nodes`
 * committed to React state — cannot do without a state update per pointer
 * move), and that one case is handled separately by TreeCanvas's own
 * draggingOverride map (see its own doc comment there).
 */
export interface TreeNodeGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  cardStyle: TreeCardStyle;
}

const TreeLayoutPositionsContext = createContext<
  Map<string, TreeNodeGeometry>
>(new Map());

export function TreeLayoutPositionsProvider({
  nodes,
  children,
}: {
  nodes: PersonFlowNode[];
  children: React.ReactNode;
}) {
  const positions = useMemo(() => {
    const map = new Map<string, TreeNodeGeometry>();
    for (const node of nodes) {
      map.set(node.id, {
        x: node.position.x,
        y: node.position.y,
        width: node.width ?? 0,
        height: node.height ?? 0,
        cardStyle: node.data.cardStyle,
      });
    }
    return map;
  }, [nodes]);

  return (
    <TreeLayoutPositionsContext.Provider value={positions}>
      {children}
    </TreeLayoutPositionsContext.Provider>
  );
}

/** One node's committed (non-DOM-dependent) geometry — see this file's own doc comment for why edges should prefer this over useInternalNode. Undefined if the id isn't currently in the rendered node set at all (e.g. hidden by collapse/expand). */
export function useTreeNodeGeometry(id: string): TreeNodeGeometry | undefined {
  const positions = useContext(TreeLayoutPositionsContext);
  return positions.get(id);
}
