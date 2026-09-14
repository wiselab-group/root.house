"use client";

import { createContext, useContext } from "react";

/**
 * tree-just-expanded-edges-context.tsx — which edge ids should play the
 * draw-in entrance animation (`.animate-tree-edge-draw`, globals.css) on
 * this render, as opposed to appearing already fully drawn.
 *
 * Every edge id newly present in the DOM does technically "mount" — but
 * that happens for reasons that have nothing to do with expanding a
 * collapsed branch too: the tree's very first paint, a focus switch
 * (buildClientTreeLayout relays out the whole graph, so effectively every
 * edge id is "new" relative to the previous focus), a filter/trace
 * highlight round-trip. A plain CSS `animation` keyed on the element's own
 * mount can't tell these apart from an actual branch expand — it would
 * play the same draw-in sweep across the WHOLE tree on every one of them,
 * which is not what was asked for ("только для разворачиваемой ветки, а не
 * все линии на canvas" — user feedback, 2026-09-14, right after the first
 * version shipped keyed purely on CSS mount).
 *
 * TreeCanvas computes this set by diffing the previous render's pruned
 * edge-id set against the current one, but ONLY when `effectiveGraph`
 * itself (the graph before pruning) is the SAME object across both
 * renders — that's the one condition that isolates "the collapse SET
 * changed" (an expand or collapse toggle) from every other reason the
 * edge list can change (a new focus, a new filter/trace highlight, initial
 * mount all produce a brand new `effectiveGraph` object). See TreeCanvas's
 * own computation for the exact diff.
 */
const TreeJustExpandedEdgesContext = createContext<ReadonlySet<string>>(
  new Set(),
);

export const TreeJustExpandedEdgesProvider =
  TreeJustExpandedEdgesContext.Provider;

/** True if this edge id should play the draw-in entrance animation on this render — see this file's own doc comment for what qualifies. */
export function useIsJustExpandedEdge(edgeId: string): boolean {
  const ids = useContext(TreeJustExpandedEdgesContext);
  return ids.has(edgeId);
}
